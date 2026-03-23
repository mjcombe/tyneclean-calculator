/**
 * Window Cleaning Pricing Calculator - FULL REVISED VERSION
 * Includes new inputs + improved robustness
 */

const pricingData = {
    "semi-terrace": {
        "2-3": { base4w: 17, base8w: 23, extras: { conservatory: 6, extension: 5, garage: 2 } },
        "4": { base4w: 18, base8w: 24, extras: { conservatory: 6, extension: 5, garage: 2 } },
        "5": { base4w: 19, base8w: 26, extras: { conservatory: 7, extension: 6, garage: 2 } }
    },
    "detached-townhouse": {
        "3": { base4w: 20, base8w: 27, extras: { conservatory: 7, extension: 6, garage: 2 } },
        "4": { base4w: 22, base8w: 29, extras: { conservatory: 8, extension: 7, garage: 2 } },
        "5": { base4w: 24, base8w: 32, extras: { conservatory: 8, extension: 7, garage: 2 } }
    }
};

const specialistPricing = {
    gutter: { semi: 110, detached34: 130, detached5: 160, modifier: 20 },
    fascia: { semi: 110, detached34: 140, detached5: 170, modifier: 20 },
    conservatoryRoof: { semi: 110, detached34: 140, detached5: 170 }
};

const allowedPostcodePrefixes = ['NE', 'SR', 'DH'];

// DOM
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

// NEW INPUTS
const skylights = document.getElementById('skylights');
const bifolds = document.getElementById('bifolds');
const rearAccess = document.getElementById('rear-access');
const lockedGates = document.getElementById('locked-gates');
const dog = document.getElementById('dog');

/**
 * CATEGORY HELPER
 */
function getPropertyCategory() {
    const type = propertyTypeSelect.value;
    const beds = bedroomsSelect.value;

    if (type === 'semi-terrace') return 'semi';
    if (beds === '5') return 'detached5';
    return 'detached34';
}

/**
 * POSTCODE VALIDATION
 */
function validatePostcode() {
    const value = postcodeInput.value.trim().toUpperCase();
    const regex = /^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$/;

    if (!regex.test(value)) {
        postcodeStatus.textContent = 'Enter a valid postcode';
        postcodeStatus.className = 'postcode-status status-error';
        return false;
    }

    const prefix = value.match(/^[A-Z]{1,2}/)[0];

    if (!allowedPostcodePrefixes.includes(prefix)) {
        postcodeStatus.textContent = 'Area not covered';
        postcodeStatus.className = 'postcode-status status-error';
        return false;
    }

    postcodeStatus.textContent = 'We cover your area';
    postcodeStatus.className = 'postcode-status status-success';
    return true;
}

/**
 * MAIN CALCULATION
 */
function calculatePrice() {

    if (!validatePostcode()) {
        priceBox.classList.add('hidden');
        return;
    }

    const propertyType = propertyTypeSelect.value;
    const bedrooms = bedroomsSelect.value;
    const frequency = Array.from(frequencyRadios).find(r => r.checked).value;

    const data = pricingData[propertyType][bedrooms];

    let total = frequency === '4w' ? data.base4w : data.base8w;

    // STANDARD EXTRAS
    extrasCheckboxes.forEach(cb => {
        if (cb.checked) total += data.extras[cb.dataset.extra];
    });

    // NEW ADDITIONS
    if (skylights && skylights.checked) total += 3;
    if (bifolds && bifolds.checked) total += 3;

    // SPECIALIST
    let specialistTotal = 0;
    const category = getPropertyCategory();

    specialistCheckboxes.forEach(cb => {
        if (!cb.checked) return;

        const service = cb.dataset.service;
        let price = specialistPricing[service][category];

        const freqSelect = document.querySelector(`.specialist-frequency[data-service="${service}"]`);
        const freq = freqSelect ? freqSelect.value : 'one-off';

        if (freq === 'yearly') price *= 0.8;
        if (freq === '6-monthly') price *= 0.7;
        if (freq === 'quarterly') price *= 0.6;

        specialistTotal += price;
    });

    // DISPLAY
    if (specialistTotal > 0) {
        priceLabel.innerHTML = `
            Recurring: £${total}<br>
            Specialist: £${Math.round(specialistTotal)}
        `;
        priceValue.textContent = `£${Math.round(total + specialistTotal)}`;
    } else {
        priceLabel.textContent = 'Estimated price per clean:';
        priceValue.textContent = `£${total}`;
    }

    priceBox.classList.remove('hidden');
}

/**
 * BEDROOM OPTIONS
 */
function updateBedroomOptions() {
    bedroomsSelect.innerHTML = '';

    const options = propertyTypeSelect.value === 'semi-terrace'
        ? ['2-3', '4', '5']
        : ['3', '4', '5'];

    options.forEach(val => {
        const opt = document.createElement('option');
        opt.value = val;
        opt.textContent = val + ' Bedrooms';
        bedroomsSelect.appendChild(opt);
    });

    calculatePrice();
}

/**
 * EVENTS
 */
propertyTypeSelect.addEventListener('change', updateBedroomOptions);
bedroomsSelect.addEventListener('change', calculatePrice);

frequencyRadios.forEach(r => r.addEventListener('change', calculatePrice));
extrasCheckboxes.forEach(cb => cb.addEventListener('change', calculatePrice));
specialistCheckboxes.forEach(cb => cb.addEventListener('change', calculatePrice));
specialistFrequencies.forEach(s => s.addEventListener('change', calculatePrice));

postcodeInput.addEventListener('input', calculatePrice);

// NEW EVENTS
if (skylights) skylights.addEventListener('change', calculatePrice);
if (bifolds) bifolds.addEventListener('change', calculatePrice);

/**
 * INIT
 */
updateBedroomOptions();
calculatePrice();
