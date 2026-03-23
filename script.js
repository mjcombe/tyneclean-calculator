/**
 * Window Cleaning Pricing Calculator - Logic
 * Handles dynamic pricing, postcode validation, and UI updates.
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

const specialistPricing = {
    gutter: {
        semi: 110,
        detached34: 130,
        detached5: 160,
        modifier: 20 // with Extension or Conservatory
    },
    fascia: {
        semi: 110,
        detached34: 140,
        detached5: 170,
        modifier: 20 // with Extension or Conservatory
    },
    conservatoryRoof: {
        semi: 110,
        detached34: 140,
        detached5: 170
    }
};

const allowedPostcodePrefixes = ['NE', 'SR', 'DH'];

// DOM Elements
const propertyTypeSelect = document.getElementById('property-type');
const bedroomsSelect = document.getElementById('bedrooms');
const frequencyRadios = document.getElementsByName('frequency');
const extrasCheckboxes = document.querySelectorAll('.extra-checkbox');
const specialistCheckboxes = document.querySelectorAll('.specialist-checkbox');
const specialistFrequencies = document.querySelectorAll('.specialist-frequency');
const postcodeInput = document.getElementById('postcode');
const postcodeStatus = document.getElementById('postcode-status');
const priceBox = document.getElementById('price-box');
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
const formFrequency = document.getElementById('form-frequency');

// Referral Elements
const referBtn = document.getElementById('refer-btn');
const referralContainer = document.getElementById('referral-link-container');
const referralInput = document.getElementById('referral-link-input');
const copyBtn = document.getElementById('copy-btn');
const copySuccess = document.getElementById('copy-success');

/**
 * Populates the quote summary in the signup form
 */
function populateSummary() {
    const propertyType = propertyTypeSelect.options[propertyTypeSelect.selectedIndex].text;
    const bedrooms = bedroomsSelect.options[bedroomsSelect.selectedIndex].text;
    const frequency = Array.from(frequencyRadios).find(r => r.checked).nextElementSibling.textContent;
    
    const data = pricingData[propertyTypeSelect.value][bedroomsSelect.value];
    let recurringTotal = (Array.from(frequencyRadios).find(r => r.checked).value === '4w' ? data.base4w : data.base8w);
    
    let html = `
        <div class="summary-item">
            <span>${propertyType} (${bedrooms})</span>
            <span>£${recurringTotal}</span>
        </div>
        <div class="summary-item">
            <span>Frequency</span>
            <span>${frequency}</span>
        </div>
    `;

    extrasCheckboxes.forEach(checkbox => {
        if (checkbox.checked) {
            const extraId = checkbox.dataset.extra;
            const price = data.extras[extraId];
            const name = checkbox.closest('.checkbox-option').querySelector('.checkbox-text').textContent;
            html += `
                <div class="summary-item">
                    <span>+ ${name}</span>
                    <span>£${price}</span>
                </div>
            `;
            recurringTotal += price;
        }
    });

    let specialistTotal = 0;
    const category = getPropertyCategory();
    const hasModifier = Array.from(extrasCheckboxes).some(cb => (cb.dataset.extra === 'extension' || cb.dataset.extra === 'conservatory') && cb.checked);

    let gutterYearly = false;
    let fasciaYearly = false;
    let gutterPrice = 0;
    let fasciaPrice = 0;

    specialistCheckboxes.forEach(checkbox => {
        if (checkbox.checked) {
            const serviceId = checkbox.dataset.service;
            const freqSelect = document.querySelector(`.specialist-frequency[data-service="${serviceId}"]`);
            const freqText = freqSelect.options[freqSelect.selectedIndex].text;
            
            let price = specialistPricing[serviceId][category];
            if (hasModifier && specialistPricing[serviceId].modifier) {
                price += specialistPricing[serviceId].modifier;
            }

            if (serviceId === 'gutter') {
                gutterPrice = price;
                if (freqSelect.value === 'yearly') gutterYearly = true;
            } else if (serviceId === 'fascia') {
                fasciaPrice = price;
                if (freqSelect.value === 'yearly') fasciaYearly = true;
            }

            let finalPrice = price;
            if (serviceId === 'conservatoryRoof') {
                if (freqSelect.value === 'yearly') finalPrice *= 0.8;
                else if (freqSelect.value === '6-monthly') finalPrice *= 0.7;
                else if (freqSelect.value === 'quarterly') finalPrice *= 0.6;
            } else {
                if (freqSelect.value === 'yearly') finalPrice *= 0.8;
            }

            const name = checkbox.closest('.checkbox-option').querySelector('.checkbox-text').textContent;
            html += `
                <div class="summary-item">
                    <span>${name} (${freqText})</span>
                    <span>£${Math.round(finalPrice)}</span>
                </div>
            `;
            specialistTotal += finalPrice;
        }
    });

    if (gutterYearly && fasciaYearly) {
        const currentAdded = (gutterPrice * 0.8) + (fasciaPrice * 0.8);
        const targetAdded = (gutterPrice + fasciaPrice) * 0.7;
        specialistTotal = specialistTotal - currentAdded + targetAdded;
    }

    summaryDetails.innerHTML = html;
    summaryTotal.innerHTML = `
        <span>Total Estimated First Visit</span>
        <span>£${Math.round(recurringTotal + specialistTotal)}</span>
    `;
}

/**
 * Handles the character and word counter for the notes field
 */
generalNotes.addEventListener('input', () => {
    const text = generalNotes.value.trim();
    const chars = text.length;
    const words = text ? text.split(/\s+/).length : 0;
    charCounter.textContent = `${chars} characters / ${words} words`;
});

/**
 * Navigation between calculator and signup form
 */
nextStepBtn.addEventListener('click', () => {
    populateSummary();
    
    // Pre-fill form fields
    formPostcode.value = postcodeInput.value.toUpperCase();
    formPropertyType.value = propertyTypeSelect.value;
    
    // Sync bedroom options to the disabled form select
    formBedrooms.innerHTML = bedroomsSelect.innerHTML;
    formBedrooms.value = bedroomsSelect.value;
    
    const frequency = Array.from(frequencyRadios).find(r => r.checked).value;
    formFrequency.value = frequency;

    mainCalculator.classList.add('hidden');
    if (exampleBox) exampleBox.classList.add('hidden');
    if (serviceNotes) serviceNotes.classList.add('hidden');
    priceBox.classList.add('hidden');
    signupSection.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

backToCalcBtn.addEventListener('click', () => {
    signupSection.classList.add('hidden');
    mainCalculator.classList.remove('hidden');
    if (exampleBox) exampleBox.classList.remove('hidden');
    if (serviceNotes) serviceNotes.classList.remove('hidden');
    priceBox.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

/**
 * Form Submission
 */
signupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    // In a real app, you would send the form data to a server here.
    // For this demo, we'll just redirect to the direct debit site.
    window.location.href = 'https://tyneclean.co.uk/';
});

/**
 * Generates a unique referral link
 */
function generateReferralLink() {
    const randomId = Math.random().toString(36).substring(2, 10);
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}?ref=${randomId}`;
}

/**
 * Handles the refer a friend button click
 */
referBtn.addEventListener('click', () => {
    const link = generateReferralLink();
    referralInput.value = link;
    referralContainer.classList.remove('hidden');
    referBtn.classList.add('hidden');
});

/**
 * Handles copying the referral link
 */
copyBtn.addEventListener('click', () => {
    referralInput.select();
    referralInput.setSelectionRange(0, 99999); // For mobile devices
    
    navigator.clipboard.writeText(referralInput.value).then(() => {
        copySuccess.classList.remove('hidden');
        copyBtn.textContent = 'Copied!';
        setTimeout(() => {
            copySuccess.classList.add('hidden');
            copyBtn.textContent = 'Copy';
        }, 2000);
    });
});

/**
 * Updates the bedroom options based on selected property type
 */
function updateBedroomOptions() {
    const propertyType = propertyTypeSelect.value;
    const currentVal = bedroomsSelect.value;
    
    // Clear existing options
    bedroomsSelect.innerHTML = '';
    
    let options = [];
    if (propertyType === 'semi-terrace') {
        options = [
            { value: '2-3', text: '2-3 Bedrooms' },
            { value: '4', text: '4 Bedrooms' },
            { value: '5', text: '5 Bedrooms' }
        ];
    } else {
        options = [
            { value: '3', text: '3 Bedrooms' },
            { value: '4', text: '4 Bedrooms' },
            { value: '5', text: '5 Bedrooms' }
        ];
    }
    
    options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.text;
        bedroomsSelect.appendChild(option);
    });
    
    // Try to keep previous selection if it exists in new list
    if (options.some(o => o.value === currentVal)) {
        bedroomsSelect.value = currentVal;
    }
    
    updateExtrasLabels();
    calculatePrice();
}

/**
 * Updates the price labels displayed next to extras
 */
function updateExtrasLabels() {
    const propertyType = propertyTypeSelect.value;
    const bedrooms = bedroomsSelect.value;
    const data = pricingData[propertyType][bedrooms];
    
    extrasCheckboxes.forEach(checkbox => {
        const extraId = checkbox.dataset.extra;
        const price = data.extras[extraId];
        const container = checkbox.closest('.checkbox-option');
        const label = container.querySelector('.checkbox-price');
        label.textContent = `+£${price}`;
        
        // Update tooltip with cost
        const tooltip = container.querySelector('.tooltip-text');
        const baseText = tooltip.dataset.baseText || tooltip.textContent.split(' Cost:')[0];
        if (!tooltip.dataset.baseText) tooltip.dataset.baseText = baseText;
        tooltip.textContent = `${baseText} Cost: +£${price}`;
    });

    // Update Specialist Labels
    const category = getPropertyCategory();
    const hasModifier = Array.from(extrasCheckboxes).some(cb => (cb.dataset.extra === 'extension' || cb.dataset.extra === 'conservatory') && cb.checked);
    
    specialistCheckboxes.forEach(checkbox => {
        const serviceId = checkbox.dataset.service;
        const freqSelect = document.querySelector(`.specialist-frequency[data-service="${serviceId}"]`);
        const freq = freqSelect ? freqSelect.value : 'one-off';
        
        let price = specialistPricing[serviceId][category];
        
        if (hasModifier && specialistPricing[serviceId].modifier) {
            price += specialistPricing[serviceId].modifier;
        }

        // Apply visual discount in label
        if (freq === 'yearly') price *= 0.8;
        else if (freq === '6-monthly') price *= 0.7;
        else if (freq === 'quarterly') price *= 0.6;
        
        const label = checkbox.closest('.checkbox-option').querySelector('.specialist-price');
        label.textContent = `£${Math.round(price)}`;
    });
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
 * Validates the postcode and returns true if valid and in service area
 */
function validatePostcode() {
    const rawValue = postcodeInput.value.trim().toUpperCase();
    
    // Basic UK Postcode Regex
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
 * Calculates the total price based on all selections
 */
function calculatePrice() {
    const isPostcodeValid = validatePostcode();
    
    if (!isPostcodeValid) {
        priceBox.classList.add('hidden');
        return;
    }
    
    const propertyType = propertyTypeSelect.value;
    const bedrooms = bedroomsSelect.value;
    const frequency = Array.from(frequencyRadios).find(r => r.checked).value;
    
    // 1. Calculate Recurring Window Cleaning Price
    const data = pricingData[propertyType][bedrooms];
    let recurringTotal = frequency === '4w' ? data.base4w : data.base8w;
    
    extrasCheckboxes.forEach(checkbox => {
        if (checkbox.checked) {
            const extraId = checkbox.dataset.extra;
            recurringTotal += data.extras[extraId];
        }
    });

    // 2. Calculate One-Off Specialist Services Total
    let specialistTotal = 0;
    const category = getPropertyCategory();
    const hasModifier = Array.from(extrasCheckboxes).some(cb => (cb.dataset.extra === 'extension' || cb.dataset.extra === 'conservatory') && cb.checked);

    let gutterYearly = false;
    let fasciaYearly = false;
    let gutterPrice = 0;
    let fasciaPrice = 0;

    specialistCheckboxes.forEach(checkbox => {
        if (checkbox.checked) {
            const serviceId = checkbox.dataset.service;
            const freq = document.querySelector(`.specialist-frequency[data-service="${serviceId}"]`).value;
            
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

            // Apply individual discounts (will be overridden for combined if needed)
            if (serviceId === 'conservatoryRoof') {
                if (freq === 'yearly') price *= 0.8;
                else if (freq === '6-monthly') price *= 0.7;
                else if (freq === 'quarterly') price *= 0.6;
                specialistTotal += price;
            } else {
                // For gutter/fascia, we'll sum them separately to handle the 30% rule
                if (freq === 'yearly') price *= 0.8;
                specialistTotal += price;
            }
        }
    });

    // Handle the "Gutters & Fascias Yearly - 30% off" rule
    if (gutterYearly && fasciaYearly) {
        // We already added (gutterPrice * 0.8) + (fasciaPrice * 0.8)
        // We want (gutterPrice + fasciaPrice) * 0.7
        const currentAdded = (gutterPrice * 0.8) + (fasciaPrice * 0.8);
        const targetAdded = (gutterPrice + fasciaPrice) * 0.7;
        specialistTotal = specialistTotal - currentAdded + targetAdded;
    }
    
    // Update Price Display
    if (specialistTotal > 0) {
        priceLabel.innerHTML = `Recurring clean: <strong>£${recurringTotal}</strong><br>Specialist services: <strong>£${Math.round(specialistTotal)}</strong>`;
        priceValue.textContent = `Total: £${Math.round(recurringTotal + specialistTotal)}`;
        priceValue.style.fontSize = '1.25rem';
    } else {
        priceLabel.textContent = 'Estimated price per clean:';
        priceValue.textContent = `£${recurringTotal}`;
        priceValue.style.fontSize = '1.5rem';
    }
    
    priceBox.classList.remove('hidden');
    updateExtrasLabels(); // Ensure specialist labels update if extension/conservatory checked
}

// Event Listeners
propertyTypeSelect.addEventListener('change', updateBedroomOptions);
bedroomsSelect.addEventListener('change', () => {
    updateExtrasLabels();
    calculatePrice();
});

frequencyRadios.forEach(radio => {
    radio.addEventListener('change', calculatePrice);
});

extrasCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', calculatePrice);
});

specialistCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', calculatePrice);
});

specialistFrequencies.forEach(select => {
    select.addEventListener('change', () => {
        updateExtrasLabels();
        calculatePrice();
    });
});

postcodeInput.addEventListener('input', calculatePrice);

// Initial Setup
updateBedroomOptions();
calculatePrice();
