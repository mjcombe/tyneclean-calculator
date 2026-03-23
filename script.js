document.addEventListener("DOMContentLoaded", () => {

// DOM
const propertyType = document.getElementById('property-type');
const bedrooms = document.getElementById('bedrooms');
const frequencyRadios = document.getElementsByName('frequency');

const postcode = document.getElementById('postcode');
const postcodeStatus = document.getElementById('postcode-status');

const priceBox = document.getElementById('price-box');
const priceValue = document.getElementById('price-value');

// NEW FIELDS (YOU MUST MATCH THESE IDs IN HTML)
const windowCount = document.getElementById('window-count');
const bifoldCount = document.getElementById('bifold-count');
const garageCount = document.getElementById('garage-count');

const hasConservatory = document.getElementById('conservatory-yes');
const hasExtension = document.getElementById('extension-yes');

// BASE PRICING (YOU CAN TWEAK THESE)
const basePerWindow = 1.2;
const bifoldPrice = 3;
const garagePrice = 2;

const conservatoryPrice = 6;
const extensionPrice = 5;

// POSTCODE CHECK
const allowedPrefixes = ['NE', 'SR', 'DH'];

function validatePostcode() {
    const val = postcode.value.trim().toUpperCase();
    const regex = /^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$/;

    if (!regex.test(val)) {
        postcodeStatus.textContent = 'Enter valid postcode';
        return false;
    }

    const prefix = val.match(/^[A-Z]{1,2}/)[0];

    if (!allowedPrefixes.includes(prefix)) {
        postcodeStatus.textContent = 'Area not covered';
        return false;
    }

    postcodeStatus.textContent = 'We cover your area';
    return true;
}

// MAIN CALC
function calculatePrice() {

    if (!validatePostcode()) {
        priceBox.classList.add('hidden');
        return;
    }

    let total = 0;

    // WINDOWS (CORE DRIVER)
    const windows = parseInt(windowCount.value) || 0;
    total += windows * basePerWindow;

    // BIFOLDS
    const bifolds = parseInt(bifoldCount.value) || 0;
    total += bifolds * bifoldPrice;

    // GARAGE DOORS
    const garages = parseInt(garageCount.value) || 0;
    total += garages * garagePrice;

    // CONSERVATORY
    if (hasConservatory && hasConservatory.checked) {
        total += conservatoryPrice;
    }

    // EXTENSION
    if (hasExtension && hasExtension.checked) {
        total += extensionPrice;
    }

    // FREQUENCY ADJUSTMENT
    const freq = Array.from(frequencyRadios).find(r => r.checked)?.value;

    if (freq === '8w') {
        total *= 1.3; // uplift for less frequent
    }

    total = Math.round(total);

    priceValue.textContent = `£${total}`;
    priceBox.classList.remove('hidden');
}

// EVENTS
[
    propertyType,
    bedrooms,
    windowCount,
    bifoldCount,
    garageCount,
    hasConservatory,
    hasExtension,
    postcode
].forEach(el => {
    if (el) el.addEventListener('input', calculatePrice);
});

frequencyRadios.forEach(r => r.addEventListener('change', calculatePrice));

// INIT
calculatePrice();

});
