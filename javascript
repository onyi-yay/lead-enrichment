const PRICE_PER_LEAD = 50;
        const FREE_LIMIT = 5;
        const WEBHOOK_URL = 'YOUR_N8N_WEBHOOK_URL_HERE'; // Replace this!
        
        // Update price estimate in real-time
        document.getElementById('emailList').addEventListener('input', (e) => {
            const emails = e.target.value.split('\n').filter(email => email.trim().length > 0);
            const totalLeads = emails.length;
            const priceEstimate = document.getElementById('priceEstimate');
            
            if (totalLeads === 0) {
                priceEstimate.textContent = 'Enter emails to see pricing';
                priceEstimate.className = 'price-estimate neutral';
            } else if (totalLeads <= FREE_LIMIT) {
                priceEstimate.innerHTML = `🎉 <strong>${totalLeads} lead${totalLeads > 1 ? 's' : ''}</strong> - Completely FREE!`;
                priceEstimate.className = 'price-estimate free';
            } else {
                const totalPrice = totalLeads * PRICE_PER_LEAD;
                priceEstimate.innerHTML = `
                    💰 <strong>${totalLeads} leads</strong><br>
                    <span style="font-size: 14px;">${FREE_LIMIT} free + ${totalLeads - FREE_LIMIT} paid = <strong>₦${totalPrice.toLocaleString()}</strong></span>
                `;
                priceEstimate.className = 'price-estimate paid';
            }
        });
        
        // Handle form submission
        document.getElementById('enrichForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitBtn = document.getElementById('submitBtn');
            const resultDiv = document.getElementById('result');
            
            // Verify reCAPTCHA
            const recaptchaResponse = grecaptcha.getResponse();
            
            if (!recaptchaResponse) {
                resultDiv.innerHTML = `
                    <div class="result error">
                        <h3>⚠️ Verification Required</h3>
                        <p>Please complete the reCAPTCHA verification</p>
                    </div>
                `;
                return;
            }
            
            // Get form data
            const emailList = document.getElementById('emailList').value;
            const emails = emailList.split('\n').filter(email => email.trim().length > 0);
            const totalLeads = emails.length;
            
            // Disable button and show loading
            submitBtn.disabled = true;
            
            if (totalLeads <= FREE_LIMIT) {
                submitBtn.textContent = '⏳ Processing free leads...';
                resultDiv.innerHTML = `
                    <div class="result loading">
                        <div class="spinner"></div>
                        Processing your ${totalLeads} free lead${totalLeads > 1 ? 's' : ''}...
                    </div>
                `;
            } else {
                submitBtn.textContent = '⏳ Preparing payment...';
                resultDiv.innerHTML = `
                    <div class="result loading">
                        <div class="spinner"></div>
                        Preparing payment for ${totalLeads} leads...
                    </div>
                `;
            }
            
            // Prepare form data
            const formData = new URLSearchParams();
            formData.append('userName', document.getElementById('userName').value);
            formData.append('userEmail', document.getElementById('userEmail').value);
            formData.append('emailList', emailList);
            formData.append('g-recaptcha-response', recaptchaResponse);
            
            try {
                const response = await fetch(WEBHOOK_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: formData
                });
                
                const data = await response.json();
                
                if (data.success) {
                    if (data.paymentUrl) {
                        // Paid tier - redirect to payment
                        resultDiv.innerHTML = `
                            <div class="result success">
                                <h3>✅ Payment Required</h3>
                                <p><strong>${data.totalLeads}</strong> leads will be enriched</p>
                                <p><strong>Total: ₦${data.amount.toLocaleString()}</strong></p>
                                <p>Redirecting to secure payment in 3 seconds...</p>
                            </div>
                        `;
                        
                        setTimeout(() => {
                            window.location.href = data.paymentUrl;
                        }, 3000);
                    } else {
                        // Free tier - show success
                        resultDiv.innerHTML = `
                            <div class="result success">
                                <h3>🎉 Processing FREE!</h3>
                                <p><strong>${totalLeads}</strong> lead${totalLeads > 1 ? 's are' : ' is'} being enriched at no cost</p>
                                <p>Results will be emailed to you within 2-5 minutes</p>
                                <p>Check your inbox: <strong>${document.getElementById('userEmail').value}</strong></p>
                            </div>
                        `;
                        document.getElementById('enrichForm').reset();
                        grecaptcha.reset();
                        document.getElementById('priceEstimate').textContent = 'Enter emails to see pricing';
                        document.getElementById('priceEstimate').className = 'price-estimate neutral';
                    }
                } else {
                    throw new Error(data.error || 'Unknown error occurred');
                }
            } catch (error) {
                resultDiv.innerHTML = `
                    <div class="result error">
                        <h3>❌ Error</h3>
                        <p>${error.message}</p>
                        <p>Please try again or contact support</p>
                    </div>
                `;
                grecaptcha.reset();
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Get Started';
            }
        });
