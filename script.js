/**
 * Window Cleaning Pricing Calculator - Logic
 * Handles dynamic pricing, window counts, specialist discounts, postcode validation, and UI updates.
 */

const pricingData = {
    "semi-terrace": {
        "2-3": { 
            base4w: 17, 
            base8w: 23, 
            extras: { conservatory: 6, extension: 5, garage: 2 } 
        },
        "4": { 
            base4w: 18, 
            base8w: 24, 
            extras: { conservatory: 6, extension: 5, garage: 2 } 
        },
        "5": { 
            base4w: 19, 
            base8w: 26, 
            extras: { conservatory: 7, extension: 6, garage: 2 } 
        }
    },
    "detached-townhouse": {
        "3": { 
            base4w: 20, 
            base8w: 27, 
            extras: { conservatory: 7, extension: 6, garage: 2 } 
        },
        "4": { 
            base4w: 22, 
            base8w: 29, 
            extras: { conservatory: 8, extension: 7, garage: 2 } 
        },
        "5": { 
            base4w: 24, 
            base8w: 32, 
            extras: { conservatory: 8, extension: 7, garage: 2 } 
        }
    }
};

// Window thresholds and extra rates per property type
const windowRules = {
    "semi-terrace": {
        included: 10,
        rate4w: 1.70,
        rate8w: 2.30
    },
    "detached-townhouse": {
        included: 13,
        rate4w: 1.70,
        rate8w: 2.30
    }
};

const specialistPricing = {
    gutter: {
        name: "Gutter Clearing (Vacuum)",
        semi: 110,
        detached34: 130,
        detached5: 160,
        modifier: 20 // with Extension or Conservatory
    },
    fascia: {
        name: "Fascia Boards Cleaned",
        semi: 110,
        detached34: 140,
        detached5: 170,
        modifier: 20 // with Extension or Conservatory
    },
    conservatoryRoof: {
        name: "Conservatory Roof Deep Clean",
        semi: 110,
        detached34: 140,
        detached5: 170
    }
};

const allowedPostcodePrefixes = ['NE', 'SR', 'DH'];

function initCalculator() {
    // DOM Elements
    const propertyTypeSelect = document.getElementById('property-type');
    const bedroomsSelect = document.getElementById('bedrooms');
    const propertyTypeButtons = document.querySelectorAll('#property-type-buttons .segmented-card-btn');
    const bedroomsButtonsContainer = document.getElementById('bedrooms-buttons');
    const windowPresetChips = document.querySelectorAll('#window-preset-chips .chip-btn');
    const bifoldAddButtons = document.querySelectorAll('.bifold-add-btn');
    const windowsInput = document.getElementById('windows-count');
    const windowsMinusBtn = document.getElementById('windows-minus-btn');
    const windowsPlusBtn = document.getElementById('windows-plus-btn');
    const windowsInfoNote = document.getElementById('windows-info-note');
    const frequencyRadios = document.getElementsByName('frequency');
    const extrasCheckboxes = document.querySelectorAll('.extra-checkbox');
    const specialistCheckboxes = document.querySelectorAll('.specialist-checkbox');
    const specialistFrequencies = document.querySelectorAll('.specialist-frequency');
    const postcodeInput = document.getElementById('postcode');
    const postcodeStatus = document.getElementById('postcode-status');
    const priceBox = document.getElementById('price-box');
    const priceBreakdownList = document.getElementById('price-breakdown-list');
    const priceValue = document.getElementById('price-value');
    const priceLabel = document.querySelector('.price-label');
    const nextStepBtn = document.getElementById('next-step-btn');

    // Signup Form Elements
    const signupSection = document.getElementById('signup-section');
    const mainCalculator = document.querySelector('main.card');
    const exampleBox = document.querySelector('.example-box');
    const serviceNotes = document.querySelector('.service-notes');
    const backToCalcBtn = document.getElementById('back-to-calc');
    const signupForm = document.getElementById('signup-form');
    const summaryDetails = document.getElementById('summary-details');
    const summaryTotal = document.getElementById('summary-total');
    const generalNotes = document.getElementById('general-notes');
    const charCounter = document.querySelector('.char-counter');

    const formPostcode = document.getElementById('form-postcode');
    const formPropertyType = document.getElementById('form-property-type');
    const formBedrooms = document.getElementById('form-bedrooms');
    const formWindows = document.getElementById('form-windows');
    const formFrequency = document.getElementById('form-frequency');

    // Referral Elements
    const referBtn = document.getElementById('refer-btn');
    const referralContainer = document.getElementById('referral-link-container');
    const referralInput = document.getElementById('referral-link-input');
    const copyBtn = document.getElementById('copy-btn');
    const copySuccess = document.getElementById('copy-success');

    if (!propertyTypeSelect || !bedroomsSelect || !windowsInput) {
        console.warn("Pricing calculator elements not found in DOM");
        return;
    }

    /**
     * Currency formatter helper
     */
    function formatPrice(num) {
        if (typeof num !== 'number' || isNaN(num)) return '£0';
        return Number.isInteger(num) ? `£${num}` : `£${num.toFixed(2)}`;
    }

    /**
     * Helper to get property category for specialist pricing
     */
    function getPropertyCategory() {
        const type = propertyTypeSelect.value;
        const beds = bedroomsSelect.value;
        
        if (type === 'semi-terrace') return 'semi';
        if (type === 'detached-townhouse') {
            if (beds === '5') return 'detached5';
            return 'detached34';
        }
        return 'semi';
    }

    /**
     * Calculates extra windows surcharge
     */
    function calculateWindowSurcharge(propertyType, frequencyVal, count) {
        const rule = windowRules[propertyType] || windowRules["semi-terrace"];
        const extraCount = Math.max(0, count - rule.included);
        const rate = frequencyVal === '4w' ? rule.rate4w : rule.rate8w;
        const surcharge = extraCount * rate;
        return {
            count,
            included: rule.included,
            extraCount,
            rate,
            surcharge
        };
    }

    /**
     * Populates the quote summary in the signup form
     */
    function populateSummary() {
        const propertyTypeVal = propertyTypeSelect.value;
        const propertyType = propertyTypeSelect.options[propertyTypeSelect.selectedIndex]?.text || propertyTypeVal;
        const bedrooms = bedroomsSelect.options[bedroomsSelect.selectedIndex]?.text || bedroomsSelect.value;
        const frequencyRadio = Array.from(frequencyRadios).find(r => r.checked) || frequencyRadios[0];
        const frequencyVal = frequencyRadio.value;
        const frequencyText = frequencyRadio.nextElementSibling.textContent;
        
        const data = pricingData[propertyTypeVal][bedroomsSelect.value] || pricingData[propertyTypeVal]["2-3"] || pricingData[propertyTypeVal]["3"];
        const baseCleanPrice = frequencyVal === '4w' ? data.base4w : data.base8w;
        
        // Windows logic
        const winCount = parseInt(windowsInput.value) || (propertyTypeVal === 'semi-terrace' ? 10 : 13);
        const winCalc = calculateWindowSurcharge(propertyTypeVal, frequencyVal, winCount);
        
        let recurringTotal = baseCleanPrice + winCalc.surcharge;
        
        let regularHtml = `
            <div class="summary-section">
                <div class="summary-section-title">Regular Window Cleaning (${frequencyText})</div>
                <div class="summary-item highlight">
                    <span>${propertyType} (${bedrooms}) - Base Clean</span>
                    <span>${formatPrice(baseCleanPrice)}</span>
                </div>
                <div class="summary-item">
                    <span>Windows & Bifold Doors: <strong>${winCount} total</strong></span>
                    <span>${winCalc.extraCount > 0 ? `+${formatPrice(winCalc.surcharge)}` : '<span style="color:var(--success); font-size:0.8rem; font-weight:600;">Included</span>'}</span>
                </div>
        `;

        if (winCalc.extraCount > 0) {
            regularHtml += `
                <div class="summary-subtext" style="margin-top: -4px; margin-bottom: 6px; padding-left: 8px;">
                    (${winCalc.extraCount} extra beyond ${winCalc.included} included limit @ ${formatPrice(winCalc.rate)}/each)
                </div>
            `;
        }

        extrasCheckboxes.forEach(checkbox => {
            if (checkbox.checked) {
                const extraId = checkbox.dataset.extra;
                const price = data.extras[extraId];
                const name = checkbox.closest('.checkbox-option').querySelector('.checkbox-text').textContent;
                regularHtml += `
                    <div class="summary-item">
                        <span>+ ${name}</span>
                        <span>+${formatPrice(price)}</span>
                    </div>
                `;
                recurringTotal += price;
            }
        });

        regularHtml += `
                <div class="summary-item highlight" style="margin-top: 10px; padding-top: 8px; border-top: 1px dashed var(--border);">
                    <span>Regular Clean Subtotal</span>
                    <span><strong>${formatPrice(recurringTotal)} per clean</strong></span>
                </div>
            </div>
        `;

        // Specialist Services
        let specialistTotal = 0;
        const category = getPropertyCategory();
        const hasModifier = Array.from(extrasCheckboxes).some(cb => (cb.dataset.extra === 'extension' || cb.dataset.extra === 'conservatory') && cb.checked);

        let gutterYearly = false;
        let fasciaYearly = false;
        let gutterPrice = 0;
        let fasciaPrice = 0;
        let selectedSpecialistCount = 0;

        let specialistItemsHtml = '';

        specialistCheckboxes.forEach(checkbox => {
            if (checkbox.checked) {
                selectedSpecialistCount++;
                const serviceId = checkbox.dataset.service;
                const freqSelect = document.querySelector(`.specialist-frequency[data-service="${serviceId}"]`);
                const freqVal = freqSelect.value;
                const freqText = freqSelect.options[freqSelect.selectedIndex].text;
                
                let price = specialistPricing[serviceId][category];
                if (hasModifier && specialistPricing[serviceId].modifier) {
                    price += specialistPricing[serviceId].modifier;
                }

                if (serviceId === 'gutter') {
                    gutterPrice = price;
                    if (freqVal === 'yearly') gutterYearly = true;
                } else if (serviceId === 'fascia') {
                    fasciaPrice = price;
                    if (freqVal === 'yearly') fasciaYearly = true;
                }

                let firstCleanPrice = price;
                let discountDesc = '';
                let repeatDesc = '';

                if (serviceId === 'conservatoryRoof') {
                    if (freqVal === 'yearly') {
                        firstCleanPrice *= 0.8;
                        discountDesc = '20% off 1st clean';
                        repeatDesc = `Subsequent cleans: ${formatPrice(price)} / year`;
                    } else if (freqVal === '6-monthly') {
                        firstCleanPrice *= 0.7;
                        discountDesc = '30% off 1st clean';
                        repeatDesc = `Subsequent cleans: ${formatPrice(price)} / 6 months`;
                    } else if (freqVal === 'quarterly') {
                        firstCleanPrice *= 0.6;
                        discountDesc = '40% off 1st clean';
                        repeatDesc = `Subsequent cleans: ${formatPrice(price)} / quarter`;
                    } else {
                        repeatDesc = 'One-off service';
                    }
                } else {
                    if (freqVal === 'yearly') {
                        firstCleanPrice *= 0.8;
                        discountDesc = '20% off 1st clean';
                        repeatDesc = `Subsequent cleans: ${formatPrice(price)} / year`;
                    } else {
                        repeatDesc = 'One-off service';
                    }
                }

                const serviceTitle = specialistPricing[serviceId].name;
                specialistItemsHtml += `
                    <div class="summary-item highlight">
                        <span>${serviceTitle} (${freqText})</span>
                        <span>${formatPrice(firstCleanPrice)}</span>
                    </div>
                    <div class="summary-subtext" style="padding-left: 8px; margin-bottom: 6px;">
                        ${discountDesc ? `<span style="color:#0284c7; font-weight:600;">${discountDesc}</span> • ` : ''}${repeatDesc}
                    </div>
                `;
                specialistTotal += firstCleanPrice;
            }
        });

        // Handle the "Gutters & Fascias Yearly - 30% off" package rule
        if (gutterYearly && fasciaYearly) {
            const currentAdded = (gutterPrice * 0.8) + (fasciaPrice * 0.8);
            const targetAdded = (gutterPrice + fasciaPrice) * 0.7;
            specialistTotal = specialistTotal - currentAdded + targetAdded;
            specialistItemsHtml += `
                <div class="summary-subtext" style="color: #059669; font-weight: 600; padding: 4px 8px; background: #ecfdf5; border-radius: 6px; margin: 6px 0;">
                    ✓ Package Special Applied: 30% OFF 1st Clean for Gutters & Fascias Bundle!
                </div>
            `;
        }

        let specialistHtml = '';
        if (selectedSpecialistCount > 0) {
            specialistHtml = `
                <div class="summary-section">
                    <div class="summary-section-title">Specialist Services Breakdown</div>
                    ${specialistItemsHtml}
                    <div class="summary-item highlight" style="margin-top: 10px; padding-top: 8px; border-top: 1px dashed var(--border);">
                        <span>Specialist 1st Visit Subtotal</span>
                        <span><strong>${formatPrice(specialistTotal)}</strong></span>
                    </div>
                </div>
            `;
        }

        if (summaryDetails) summaryDetails.innerHTML = regularHtml + specialistHtml;

        if (summaryTotal) {
            if (selectedSpecialistCount > 0) {
                summaryTotal.innerHTML = `
                    <div class="summary-total-row">
                        <span>Total Estimated 1st Visit:</span>
                        <span>${formatPrice(recurringTotal + specialistTotal)}</span>
                    </div>
                    <div class="summary-total-subrow">
                        <span>Ongoing Regular Window Cleaning:</span>
                        <span>${formatPrice(recurringTotal)} every ${frequencyVal === '4w' ? '4' : '8'} weeks</span>
                    </div>
                `;
            } else {
                summaryTotal.innerHTML = `
                    <div class="summary-total-row">
                        <span>Total Estimated Price:</span>
                        <span>${formatPrice(recurringTotal)} per clean</span>
                    </div>
                    <div class="summary-total-subrow">
                        <span>Frequency:</span>
                        <span>Every ${frequencyVal === '4w' ? '4' : '8'} weeks</span>
                    </div>
                `;
            }
        }
    }

    /**
     * Handles character and word counter
     */
    if (generalNotes && charCounter) {
        generalNotes.addEventListener('input', () => {
            const text = generalNotes.value.trim();
            const chars = text.length;
            const words = text ? text.split(/\s+/).length : 0;
            charCounter.textContent = `${chars} characters / ${words} words`;
        });
    }

    /**
     * Updates active state of Window Preset Chips based on current input value
     */
    function syncWindowChips() {
        const currentCount = parseInt(windowsInput.value) || 0;
        windowPresetChips.forEach(chip => {
            const chipCount = parseInt(chip.dataset.count);
            if (chipCount === currentCount) {
                chip.classList.add('active');
            } else {
                chip.classList.remove('active');
            }
        });
    }

    /**
     * Stepper button listeners for Windows / Bifold doors
     */
    if (windowsMinusBtn) {
        windowsMinusBtn.addEventListener('click', (e) => {
            e.preventDefault();
            let val = parseInt(windowsInput.value) || 1;
            if (val > 1) {
                windowsInput.value = val - 1;
                syncWindowChips();
                calculatePrice();
            }
        });
    }

    if (windowsPlusBtn) {
        windowsPlusBtn.addEventListener('click', (e) => {
            e.preventDefault();
            let val = parseInt(windowsInput.value) || 1;
            if (val < 60) {
                windowsInput.value = val + 1;
                syncWindowChips();
                calculatePrice();
            }
        });
    }

    if (windowsInput) {
        windowsInput.addEventListener('input', () => {
            let val = parseInt(windowsInput.value);
            if (isNaN(val) || val < 1) val = 1;
            if (val > 60) val = 60;
            syncWindowChips();
            calculatePrice();
        });
    }

    // Quick Preset Chips for Windows
    windowPresetChips.forEach(chip => {
        chip.addEventListener('click', (e) => {
            e.preventDefault();
            const count = parseInt(chip.dataset.count);
            if (!isNaN(count)) {
                windowsInput.value = count;
                syncWindowChips();
                calculatePrice();
            }
        });
    });

    // Bifold Door Quick Add Buttons
    bifoldAddButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const add = parseInt(btn.dataset.add) || 0;
            let current = parseInt(windowsInput.value) || 10;
            windowsInput.value = Math.min(60, current + add);
            syncWindowChips();
            calculatePrice();
        });
    });

    // Property Type Segmented Buttons
    propertyTypeButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const val = btn.dataset.value;
            propertyTypeSelect.value = val;
            
            propertyTypeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            updateBedroomOptions();
        });
    });

    /**
     * Navigation between calculator and signup form
     */
    if (nextStepBtn) {
        nextStepBtn.addEventListener('click', () => {
            const isPostcodeValid = validatePostcode();
            if (!isPostcodeValid) {
                if (postcodeInput) {
                    postcodeInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    postcodeInput.focus();
                }
                if (postcodeStatus) {
                    postcodeStatus.textContent = 'Please enter your postcode (e.g. NE1 1AA) to confirm service area before continuing.';
                    postcodeStatus.className = 'postcode-status status-error';
                }
                return;
            }

            populateSummary();
            
            // Pre-fill form fields
            if (formPostcode) formPostcode.value = postcodeInput.value.toUpperCase();
            if (formPropertyType) formPropertyType.value = propertyTypeSelect.value;
            
            // Sync bedroom options to the disabled form select
            if (formBedrooms) {
                formBedrooms.innerHTML = bedroomsSelect.innerHTML;
                formBedrooms.value = bedroomsSelect.value;
            }
            
            const winCount = parseInt(windowsInput.value) || 10;
            const propType = propertyTypeSelect.value;
            const threshold = propType === 'semi-terrace' ? 10 : 13;
            const extraWin = Math.max(0, winCount - threshold);
            if (formWindows) {
                formWindows.value = `${winCount} Windows / Bifolds ${extraWin > 0 ? `(${extraWin} additional)` : '(Standard)'}`;
            }
            
            const selectedFreq = Array.from(frequencyRadios).find(r => r.checked)?.value || '4w';
            if (formFrequency) formFrequency.value = selectedFreq;

            if (mainCalculator) mainCalculator.classList.add('hidden');
            if (exampleBox) exampleBox.classList.add('hidden');
            if (serviceNotes) serviceNotes.classList.add('hidden');
            if (priceBox) priceBox.classList.add('hidden');
            if (signupSection) signupSection.classList.remove('hidden');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    if (backToCalcBtn) {
        backToCalcBtn.addEventListener('click', () => {
            if (signupSection) signupSection.classList.add('hidden');
            if (mainCalculator) mainCalculator.classList.remove('hidden');
            if (exampleBox) exampleBox.classList.remove('hidden');
            if (serviceNotes) serviceNotes.classList.remove('hidden');
            if (priceBox) priceBox.classList.remove('hidden');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    /**
     * Form Submission
     */
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitBtn = signupForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn ? submitBtn.textContent : 'Submit';
            if (submitBtn) {
                submitBtn.textContent = 'Processing...';
                submitBtn.disabled = true;
            }

            const formData = {
                title: document.getElementById('title')?.value || '',
                firstName: document.getElementById('first-name')?.value || '',
                lastName: document.getElementById('last-name')?.value || '',
                companyName: document.getElementById('company-name')?.value || '',
                email: document.getElementById('email')?.value || '',
                phone: document.getElementById('phone')?.value || '',
                houseNumber: document.getElementById('house-number')?.value || '',
                streetName: document.getElementById('street-name')?.value || '',
                townCity: document.getElementById('town-city')?.value || '',
                postcode: document.getElementById('form-postcode')?.value || '',
                propertyType: document.getElementById('form-property-type')?.value || '',
                bedrooms: document.getElementById('form-bedrooms')?.value || '',
                windowsCount: document.getElementById('form-windows')?.value || '',
                frequency: document.getElementById('form-frequency')?.value || '',
                hearAbout: document.getElementById('hear-about')?.value || '',
                extraNotes: document.getElementById('extra-notes')?.value || '',
                generalNotes: document.getElementById('general-notes')?.value || '',
                summaryDetails: summaryDetails ? summaryDetails.innerHTML : '',
                summaryTotal: summaryTotal ? summaryTotal.textContent.trim().replace(/\s+/g, ' ') : ''
            };

            try {
                const response = await fetch('/api/signup', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(formData),
                });

                if (!response.ok) {
                    throw new Error('Failed to process signup');
                }

                window.location.href = 'https://tyneclean.co.uk/';
            } catch (error) {
                console.error('Error submitting form:', error);
                alert('There was an error processing your signup. Please try again or contact us directly.');
                if (submitBtn) {
                    submitBtn.textContent = originalBtnText;
                    submitBtn.disabled = false;
                }
            }
        });
    }

    /**
     * Referral Link
     */
    function generateReferralLink() {
        const randomId = Math.random().toString(36).substring(2, 10);
        const baseUrl = window.location.origin + window.location.pathname;
        return `${baseUrl}?ref=${randomId}`;
    }

    if (referBtn && referralContainer && referralInput) {
        referBtn.addEventListener('click', () => {
            const link = generateReferralLink();
            referralInput.value = link;
            referralContainer.classList.remove('hidden');
            referBtn.classList.add('hidden');
        });
    }

    if (copyBtn && referralInput) {
        copyBtn.addEventListener('click', () => {
            referralInput.select();
            referralInput.setSelectionRange(0, 99999);
            
            navigator.clipboard.writeText(referralInput.value).then(() => {
                if (copySuccess) copySuccess.classList.remove('hidden');
                copyBtn.textContent = 'Copied!';
                setTimeout(() => {
                    if (copySuccess) copySuccess.classList.add('hidden');
                    copyBtn.textContent = 'Copy';
                }, 2000);
            });
        });
    }

    /**
     * Updates the bedroom options and window defaults based on selected property type
     */
    function updateBedroomOptions() {
        const propertyType = propertyTypeSelect.value;
        const currentVal = bedroomsSelect.value;
        
        bedroomsSelect.innerHTML = '';
        if (bedroomsButtonsContainer) {
            bedroomsButtonsContainer.innerHTML = '';
        }
        
        let options = [];
        if (propertyType === 'semi-terrace') {
            options = [
                { value: '2-3', text: '2-3 Bedrooms', label: '2-3 Beds' },
                { value: '4', text: '4 Bedrooms', label: '4 Beds' },
                { value: '5', text: '5 Bedrooms', label: '5 Beds' }
            ];
        } else {
            options = [
                { value: '3', text: '3 Bedrooms', label: '3 Beds' },
                { value: '4', text: '4 Bedrooms', label: '4 Beds' },
                { value: '5', text: '5 Bedrooms', label: '5 Beds' }
            ];
        }
        
        options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.text;
            bedroomsSelect.appendChild(option);

            if (bedroomsButtonsContainer) {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'pill-btn';
                btn.dataset.value = opt.value;
                btn.textContent = opt.label;
                
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    bedroomsSelect.value = opt.value;
                    const allBtns = bedroomsButtonsContainer.querySelectorAll('.pill-btn');
                    allBtns.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    updateExtrasLabels();
                    calculatePrice();
                });

                bedroomsButtonsContainer.appendChild(btn);
            }
        });
        
        if (options.some(o => o.value === currentVal)) {
            bedroomsSelect.value = currentVal;
        } else {
            bedroomsSelect.value = options[0].value;
        }

        // Highlight matching button
        if (bedroomsButtonsContainer) {
            const allBtns = bedroomsButtonsContainer.querySelectorAll('.pill-btn');
            allBtns.forEach(btn => {
                if (btn.dataset.value === bedroomsSelect.value) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        }
        
        // Update window count default if at default limit
        if (propertyType === 'semi-terrace') {
            if (windowsInput.value === '13') windowsInput.value = '10';
        } else {
            if (windowsInput.value === '10') windowsInput.value = '13';
        }
        
        syncWindowChips();
        updateExtrasLabels();
        calculatePrice();
    }

    /**
     * Updates price labels next to extras and specialist services
     */
    function updateExtrasLabels() {
        const propertyType = propertyTypeSelect.value;
        const bedrooms = bedroomsSelect.value || (propertyType === 'semi-terrace' ? '2-3' : '3');
        const data = pricingData[propertyType][bedrooms] || pricingData[propertyType]["2-3"] || pricingData[propertyType]["3"];
        
        extrasCheckboxes.forEach(checkbox => {
            const extraId = checkbox.dataset.extra;
            const price = data.extras[extraId];
            const container = checkbox.closest('.checkbox-option');
            if (container) {
                const label = container.querySelector('.checkbox-price');
                if (label) label.textContent = `+${formatPrice(price)}`;
                
                const tooltip = container.querySelector('.tooltip-text');
                if (tooltip) {
                    const baseText = tooltip.dataset.baseText || tooltip.textContent.split(' Cost:')[0];
                    if (!tooltip.dataset.baseText) tooltip.dataset.baseText = baseText;
                    tooltip.textContent = `${baseText} Cost: +${formatPrice(price)}`;
                }
            }
        });

        // Update Specialist Labels
        const category = getPropertyCategory();
        const hasModifier = Array.from(extrasCheckboxes).some(cb => (cb.dataset.extra === 'extension' || cb.dataset.extra === 'conservatory') && cb.checked);
        
        const gutterCb = document.querySelector('.specialist-checkbox[data-service="gutter"]');
        const fasciaCb = document.querySelector('.specialist-checkbox[data-service="fascia"]');
        const gutterFreq = document.querySelector('.specialist-frequency[data-service="gutter"]')?.value;
        const fasciaFreq = document.querySelector('.specialist-frequency[data-service="fascia"]')?.value;
        const isBundle30 = (gutterCb?.checked && fasciaCb?.checked && gutterFreq === 'yearly' && fasciaFreq === 'yearly');

        specialistCheckboxes.forEach(checkbox => {
            const serviceId = checkbox.dataset.service;
            const freqSelect = document.querySelector(`.specialist-frequency[data-service="${serviceId}"]`);
            const freq = freqSelect ? freqSelect.value : 'one-off';
            
            let baseServicePrice = specialistPricing[serviceId][category];
            if (hasModifier && specialistPricing[serviceId].modifier) {
                baseServicePrice += specialistPricing[serviceId].modifier;
            }

            let firstCleanPrice = baseServicePrice;
            let repeatLabel = '';

            if (serviceId === 'conservatoryRoof') {
                if (freq === 'yearly') {
                    firstCleanPrice *= 0.8;
                    repeatLabel = `Then ${formatPrice(baseServicePrice)} / yr`;
                } else if (freq === '6-monthly') {
                    firstCleanPrice *= 0.7;
                    repeatLabel = `Then ${formatPrice(baseServicePrice)} / 6mo`;
                } else if (freq === 'quarterly') {
                    firstCleanPrice *= 0.6;
                    repeatLabel = `Then ${formatPrice(baseServicePrice)} / qtr`;
                } else {
                    repeatLabel = 'One-off clean';
                }
            } else {
                if (freq === 'yearly') {
                    const discount = (isBundle30 && (serviceId === 'gutter' || serviceId === 'fascia')) ? 0.7 : 0.8;
                    firstCleanPrice *= discount;
                    repeatLabel = `Then ${formatPrice(baseServicePrice)} / yr`;
                } else {
                    repeatLabel = 'One-off clean';
                }
            }
            
            const container = checkbox.closest('.checkbox-option');
            if (container) {
                const priceEl = container.querySelector('.specialist-price');
                const subsequentEl = container.querySelector('.specialist-subsequent-price');
                
                if (priceEl) {
                    priceEl.textContent = `1st: ${formatPrice(firstCleanPrice)}`;
                }
                if (subsequentEl) {
                    subsequentEl.textContent = repeatLabel;
                }
            }
        });
    }

    /**
     * Validates postcode
     */
    function validatePostcode() {
        if (!postcodeInput || !postcodeStatus) return false;
        const rawValue = postcodeInput.value.trim().toUpperCase();
        
        const ukPostcodeRegex = /^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$/;
        
        if (!rawValue) {
            postcodeStatus.textContent = '';
            postcodeStatus.className = 'postcode-status';
            return false;
        }
        
        if (!ukPostcodeRegex.test(rawValue)) {
            postcodeStatus.textContent = 'Please enter a valid UK postcode.';
            postcodeStatus.className = 'postcode-status status-error';
            return false;
        }
        
        const prefix = rawValue.match(/^[A-Z]{1,2}/)[0];
        const isAllowed = allowedPostcodePrefixes.includes(prefix);
        
        if (isAllowed) {
            postcodeStatus.textContent = 'Great! We cover your area.';
            postcodeStatus.className = 'postcode-status status-success';
            return true;
        } else {
            postcodeStatus.textContent = 'Sorry, we currently only cover selected North East areas.';
            postcodeStatus.className = 'postcode-status status-error';
            return false;
        }
    }

    /**
     * Calculates the total price based on all selections and updates live breakdown
     */
    function calculatePrice() {
        const propertyType = propertyTypeSelect.value;
        const bedrooms = bedroomsSelect.value || (propertyType === 'semi-terrace' ? '2-3' : '3');
        const frequencyRadio = Array.from(frequencyRadios).find(r => r.checked);
        const frequency = frequencyRadio ? frequencyRadio.value : '4w';
        const frequencyText = frequencyRadio ? frequencyRadio.nextElementSibling.textContent : 'Every 4 Weeks';
        
        // Update window info note dynamically
        const rule = windowRules[propertyType] || windowRules["semi-terrace"];
        const winCount = parseInt(windowsInput.value) || rule.included;
        const winCalc = calculateWindowSurcharge(propertyType, frequency, winCount);
        
        if (windowsInfoNote) {
            if (winCalc.extraCount > 0) {
                windowsInfoNote.innerHTML = `Standard price includes up to <strong>${rule.included} windows/bifold doors</strong>. You have <strong>${winCount}</strong> (${winCalc.extraCount} extra).<br><span class="windows-surcharge-alert">+${formatPrice(winCalc.surcharge)} surcharge per clean (${formatPrice(winCalc.rate)} each)</span>`;
            } else {
                windowsInfoNote.innerHTML = `Standard pricing includes up to <strong>${rule.included} windows/bifold doors</strong> on a ${propertyType === 'semi-terrace' ? 'semi/terrace' : 'detached/townhouse'}. Additional windows are ${formatPrice(rule.rate4w)} (4-weekly) or ${formatPrice(rule.rate8w)} (8-weekly) each. <span style="color:var(--success); font-weight:600;">✓ All ${winCount} windows covered in standard price</span>`;
            }
        }

        validatePostcode();
        
        // 1. Calculate Recurring Window Cleaning Price
        const data = pricingData[propertyType][bedrooms] || pricingData[propertyType]["2-3"] || pricingData[propertyType]["3"];
        const baseClean = frequency === '4w' ? data.base4w : data.base8w;
        let recurringTotal = baseClean + winCalc.surcharge;
        
        const propTypeText = propertyTypeSelect.options[propertyTypeSelect.selectedIndex]?.text || propertyType;
        const bedText = bedroomsSelect.options[bedroomsSelect.selectedIndex]?.text || bedrooms;

        let breakdownHtml = `
            <div class="breakdown-card">
                <div class="breakdown-card-title">1. Regular Window Cleaning (${frequencyText})</div>
                <div class="breakdown-line">
                    <span>${propTypeText} (${bedText}) Base</span>
                    <span class="item-price">${formatPrice(baseClean)}</span>
                </div>
        `;

        if (winCalc.extraCount > 0) {
            breakdownHtml += `
                <div class="breakdown-line extra">
                    <span>+ ${winCalc.extraCount} Extra Windows/Bifolds (@ ${formatPrice(winCalc.rate)}/ea)</span>
                    <span class="item-price">+${formatPrice(winCalc.surcharge)}</span>
                </div>
            `;
        }

        extrasCheckboxes.forEach(checkbox => {
            if (checkbox.checked) {
                const extraId = checkbox.dataset.extra;
                const extraPrice = data.extras[extraId];
                const name = checkbox.closest('.checkbox-option').querySelector('.checkbox-text').textContent;
                breakdownHtml += `
                    <div class="breakdown-line extra">
                        <span>+ ${name}</span>
                        <span class="item-price">+${formatPrice(extraPrice)}</span>
                    </div>
                `;
                recurringTotal += extraPrice;
            }
        });

        breakdownHtml += `
                <div class="breakdown-line subtotal">
                    <span>Regular Clean Subtotal:</span>
                    <span class="item-price">${formatPrice(recurringTotal)} / clean</span>
                </div>
            </div>
        `;

        // 2. Calculate Specialist Services Total
        let specialistTotal = 0;
        let hasSpecialist = false;
        const category = getPropertyCategory();
        const hasModifier = Array.from(extrasCheckboxes).some(cb => (cb.dataset.extra === 'extension' || cb.dataset.extra === 'conservatory') && cb.checked);

        let gutterYearly = false;
        let fasciaYearly = false;
        let gutterPrice = 0;
        let fasciaPrice = 0;

        let specialistCardsHtml = '';

        specialistCheckboxes.forEach(checkbox => {
            if (checkbox.checked) {
                hasSpecialist = true;
                const serviceId = checkbox.dataset.service;
                const freqSelect = document.querySelector(`.specialist-frequency[data-service="${serviceId}"]`);
                const freq = freqSelect ? freqSelect.value : 'one-off';
                const freqText = freqSelect ? freqSelect.options[freqSelect.selectedIndex].text : 'One-Off';
                
                let price = specialistPricing[serviceId][category];
                if (hasModifier && specialistPricing[serviceId].modifier) {
                    price += specialistPricing[serviceId].modifier;
                }

                if (serviceId === 'gutter') {
                    gutterPrice = price;
                    if (freq === 'yearly') gutterYearly = true;
                } else if (serviceId === 'fascia') {
                    fasciaPrice = price;
                    if (freq === 'yearly') fasciaYearly = true;
                }

                let firstClean = price;
                let promoBadge = '';
                let repeatNote = '';

                if (serviceId === 'conservatoryRoof') {
                    if (freq === 'yearly') {
                        firstClean *= 0.8;
                        promoBadge = '<span class="breakdown-badge">20% Off 1st Clean</span>';
                        repeatNote = `Subsequent cleans: ${formatPrice(price)} / year`;
                    } else if (freq === '6-monthly') {
                        firstClean *= 0.7;
                        promoBadge = '<span class="breakdown-badge">30% Off 1st Clean</span>';
                        repeatNote = `Subsequent cleans: ${formatPrice(price)} / 6 months`;
                    } else if (freq === 'quarterly') {
                        firstClean *= 0.6;
                        promoBadge = '<span class="breakdown-badge">40% Off 1st Clean</span>';
                        repeatNote = `Subsequent cleans: ${formatPrice(price)} / quarter`;
                    } else {
                        repeatNote = 'One-off specialist clean';
                    }
                    specialistTotal += firstClean;
                } else {
                    if (freq === 'yearly') {
                        firstClean *= 0.8;
                        promoBadge = '<span class="breakdown-badge">20% Off 1st Clean</span>';
                        repeatNote = `Subsequent cleans: ${formatPrice(price)} / year`;
                    } else {
                        repeatNote = 'One-off specialist clean';
                    }
                    specialistTotal += firstClean;
                }

                const title = specialistPricing[serviceId].name;
                specialistCardsHtml += `
                    <div class="breakdown-line">
                        <span>${title} (${freqText}) ${promoBadge}</span>
                        <span class="item-price">1st Clean: ${formatPrice(firstClean)}</span>
                    </div>
                    <div class="breakdown-desc">${repeatNote}</div>
                `;
            }
        });

        // Handle the "Gutters & Fascias Yearly - 30% off" package rule
        if (gutterYearly && fasciaYearly) {
            const currentAdded = (gutterPrice * 0.8) + (fasciaPrice * 0.8);
            const targetAdded = (gutterPrice + fasciaPrice) * 0.7;
            specialistTotal = specialistTotal - currentAdded + targetAdded;
            specialistCardsHtml += `
                <div class="breakdown-desc" style="color:#059669; font-weight:700; margin-top:4px;">
                    ★ 30% OFF Bundle Discount Applied to Gutters & Fascias 1st Clean!
                </div>
            `;
        }

        if (hasSpecialist) {
            breakdownHtml += `
                <div class="breakdown-card">
                    <div class="breakdown-card-title">2. Specialist Services (1st Clean vs Subsequent)</div>
                    ${specialistCardsHtml}
                    <div class="breakdown-line subtotal">
                        <span>Specialist 1st Clean Subtotal:</span>
                        <span class="item-price">${formatPrice(specialistTotal)}</span>
                    </div>
                </div>
            `;
        }

        if (priceBreakdownList) priceBreakdownList.innerHTML = breakdownHtml;

        // Update Price Display in footer
        if (priceLabel && priceValue) {
            if (hasSpecialist) {
                priceLabel.textContent = 'Estimated 1st visit total (Regular + Specialist):';
                priceValue.innerHTML = `${formatPrice(recurringTotal + specialistTotal)} <div class="price-subvalue">Then ${formatPrice(recurringTotal)} per regular clean (${frequencyText.toLowerCase()})</div>`;
            } else {
                priceLabel.textContent = `Estimated price per clean (${frequencyText.toLowerCase()}):`;
                priceValue.innerHTML = `${formatPrice(recurringTotal)}`;
            }
        }
        
        if (priceBox) priceBox.classList.remove('hidden');
        updateExtrasLabels();
    }

    // Event Listeners
    propertyTypeSelect.addEventListener('change', updateBedroomOptions);
    bedroomsSelect.addEventListener('change', () => {
        updateExtrasLabels();
        calculatePrice();
    });

    frequencyRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            updateExtrasLabels();
            calculatePrice();
        });
    });

    extrasCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            updateExtrasLabels();
            calculatePrice();
        });
    });

    specialistCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            updateExtrasLabels();
            calculatePrice();
        });
    });

    specialistFrequencies.forEach(select => {
        select.addEventListener('change', () => {
            updateExtrasLabels();
            calculatePrice();
        });
    });

    if (postcodeInput) {
        postcodeInput.addEventListener('input', calculatePrice);
    }

    // Initial Setup
    updateBedroomOptions();
    calculatePrice();
}

// Ensure execution on DOM ready or immediate if already loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCalculator);
} else {
    initCalculator();
}
