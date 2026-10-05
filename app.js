import { AREAS, defaultsFor, PLANNING_DEFAULTS, calculatePlan, compareScenarios } from './revenue.js';

const $ = selector => document.querySelector(selector);
const form = $('#calculator-form');
const area = $('#area');
const propertyType = $('#property-type');
const bedrooms = $('#bedrooms');
const planner = $('#revenue-dialog');
const rate = $('#nightly-rate');
const occupancy = $('#occupancy');
const planFields = [...document.querySelectorAll('[data-plan-key]')];
const phonePlanner = matchMedia('(max-width: 700px)');
const numberFormat = new Intl.NumberFormat('en-AE', { maximumFractionDigits: 0 });
const money = value => numberFormat.format(value);
const currency = value => `AED ${money(value)}`;
const propertySummary = () => `${AREAS[area.value].name} · ${Number(bedrooms.value) === 0 ? 'Studio' : `${bedrooms.value}-bedroom`} ${propertyType.value}`;
const propertyKey = () => `${area.value}/${propertyType.value}/${bedrooms.value}`;
let period = 'annual';
let currentResult = null;
let currentInput = null;
let savedPlan = null;
let plannerInitialized = false;
let lastPropertyKey = '';
let activePanel = 'income';

function syncModalState() {
  document.body.classList.toggle('modal-open', Boolean(document.querySelector('dialog[open]')));
}
function validateBedrooms(type, bedroomSelect) {
  const villa = type.value === 'villa';
  for (const option of bedroomSelect.options) option.disabled = villa && Number(option.value) < 2;
  if (villa && Number(bedroomSelect.value) < 2) bedroomSelect.value = '2';
}
for (const [source, target] of [[area, $('#plan-area')], [propertyType, $('#plan-type')], [bedrooms, $('#plan-bedrooms')]]) {
  for (const option of source.options) target.append(option.cloneNode(true));
}
function syncPropertyControls() {
  $('#plan-area').value = area.value;
  $('#plan-type').value = propertyType.value;
  $('#plan-bedrooms').value = bedrooms.value;
  validateBedrooms($('#plan-type'), $('#plan-bedrooms'));
  $('#planner-property-summary').textContent = propertySummary();
}
function applyPropertyDefaults() {
  const defaults = defaultsFor(area.value, propertyType.value, Number(bedrooms.value));
  rate.value = defaults.nightly;
  occupancy.value = defaults.occupancy;
  $('#occupancy-slider').value = defaults.occupancy;
  if (lastPropertyKey && lastPropertyKey !== propertyKey()) $('#property-value').value = 0;
  lastPropertyKey = propertyKey();
}
function resetPlan() {
  for (const field of planFields) if (field.dataset.planKey in PLANNING_DEFAULTS) field.value = PLANNING_DEFAULTS[field.dataset.planKey];
  applyPropertyDefaults();
  renderPlan();
}
function showPanel(name, scroll = true) {
  activePanel = name;
  for (const button of document.querySelectorAll('[data-panel]')) button.setAttribute('aria-pressed', String(button.dataset.panel === name));
  for (const panel of document.querySelectorAll('.planner-panel')) panel.hidden = panel.id !== `panel-${name}`;
  $('.planner-controls').hidden = name === 'results';
  $('#panel-results').hidden = phonePlanner.matches && name !== 'results';
  $('.planner-body').classList.toggle('show-results', name === 'results');
  const labels = { property: 'Next: income', income: 'Next: costs', costs: 'See results', results: 'Edit inputs' };
  $('#planner-next').firstChild.textContent = labels[name] + ' ';
  if (scroll) $('.planner-body').scrollTop = 0;
}
for (const button of document.querySelectorAll('[data-panel]')) button.addEventListener('click', () => showPanel(button.dataset.panel));
$('#planner-next').addEventListener('click', () => {
  const next = { property: 'income', income: 'costs', costs: 'results', results: 'property' }[activePanel];
  showPanel(next);
  $(`[data-panel="${next}"]`).focus({ preventScroll: true });
});
phonePlanner.addEventListener('change', () => showPanel(activePanel, false));
function openPlanner() {
  syncPropertyControls();
  if (!plannerInitialized) { plannerInitialized = true; resetPlan(); }
  else if (lastPropertyKey !== propertyKey()) applyPropertyDefaults();
  renderPlan();
  showPanel('income');
  planner.showModal();
  syncModalState();
  $('#tab-income').focus({ preventScroll: true });
}
function closePlanner() { if (planner.open) planner.close(); }
form.addEventListener('submit', event => { event.preventDefault(); openPlanner(); });
propertyType.addEventListener('change', () => validateBedrooms(propertyType, bedrooms));
form.addEventListener('change', () => {
  if (!plannerInitialized) return;
  syncPropertyControls();
  applyPropertyDefaults();
  renderPlan();
});
for (const select of [$('#plan-area'), $('#plan-type'), $('#plan-bedrooms')]) select.addEventListener('change', () => {
  validateBedrooms($('#plan-type'), $('#plan-bedrooms'));
  area.value = $('#plan-area').value;
  propertyType.value = $('#plan-type').value;
  bedrooms.value = $('#plan-bedrooms').value;
  validateBedrooms(propertyType, bedrooms);
  syncPropertyControls();
  applyPropertyDefaults();
  renderPlan();
});
$('.planner-close').addEventListener('click', closePlanner);
planner.addEventListener('close', syncModalState);
planner.addEventListener('click', event => {
  const box = planner.getBoundingClientRect();
  if (event.target === planner && (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom)) closePlanner();
});
for (const field of planFields) field.addEventListener('input', () => {
  if (field === occupancy && field.validity.valid) $('#occupancy-slider').value = occupancy.value;
  renderPlan();
});
$('#occupancy-slider').addEventListener('input', event => { occupancy.value = event.target.value; renderPlan(); });
$('#reset-plan').addEventListener('click', () => { resetPlan(); $('#planner-status').textContent = 'Inputs reset to example assumptions.'; });
for (const button of document.querySelectorAll('[data-period]')) button.addEventListener('click', () => {
  period = button.dataset.period;
  for (const item of document.querySelectorAll('[data-period]')) item.setAttribute('aria-pressed', String(item === button));
  renderPlan();
});

function renderPlan() {
  const invalid = planFields.filter(field => !field.validity.valid || !Number.isFinite(field.valueAsNumber));
  for (const field of planFields) {
    if (invalid.includes(field)) { field.setAttribute('aria-invalid', 'true'); field.setAttribute('aria-describedby', 'planner-error'); }
    else { field.removeAttribute('aria-invalid'); if (field.id !== 'property-value') field.removeAttribute('aria-describedby'); else field.setAttribute('aria-describedby', 'value-help'); }
  }
  $('#planner-error').hidden = invalid.length === 0;
  $('#save-plan').disabled = $('#export-plan').disabled = invalid.length > 0;
  if (invalid.length) {
    const field = invalid[0];
    const label = field.closest('.plan-field').querySelector('label').firstChild.textContent.trim();
    $('#planner-error').textContent = `${label}: enter ${field.step === '1' ? 'a whole number' : 'a number'} from ${money(Number(field.min))} to ${money(Number(field.max))}.`;
    currentResult = null;
    for (const selector of ['#plan-net', '#plan-gross', '#plan-costs', '#live-net', '#plan-break-even', '#plan-yield', '#saved-difference']) $(selector).textContent = '—';
    for (const element of document.querySelectorAll('[data-cost]')) element.textContent = '—';
    $('#plan-result-sub').textContent = 'Update the highlighted input to see your estimate.';
    $('#availability-summary').textContent = 'Complete the inputs to calculate available nights.';
    $('#scenario-cards').replaceChildren();
    return;
  }
  $('#planner-error').textContent = '';
  currentInput = Object.fromEntries(planFields.map(field => [field.dataset.planKey, field.valueAsNumber]));
  currentResult = calculatePlan(currentInput);
  const result = currentResult;
  const divisor = period === 'monthly' ? 12 : 1;
  const periodLabel = period === 'monthly' ? 'Monthly average' : 'Annual';
  $('#plan-net-label').textContent = `${periodLabel} income after entered costs`;
  $('#live-net-label').textContent = `${period === 'monthly' ? 'Monthly' : 'Yearly'} income after costs`;
  $('#plan-net').textContent = money(result.net / divisor);
  $('#live-net').textContent = currency(result.net / divisor);
  $('#plan-gross').textContent = currency(result.gross / divisor);
  $('#plan-costs').textContent = currency(result.totalCosts / divisor);
  $('#plan-net').classList.toggle('is-loss', result.net < 0);
  $('#plan-result-sub').textContent = `${money(result.bookedNights)} booked nights / year · ${currentInput.occupancy}% occupancy${result.net < 0 ? ' · Costs exceed revenue' : ''}`;
  $('#availability-summary').textContent = `${result.availableNights} nights available per year · about ${money(result.bookedNights)} booked nights.`;
  for (const element of document.querySelectorAll('[data-cost]')) element.textContent = currency(result.costs[element.dataset.cost] / divisor);
  $('#plan-break-even').textContent = result.breakEven === null ? 'Not achievable' : `${result.breakEven.toFixed(1)}%`;
  $('#plan-yield').textContent = result.yield === null ? 'Add a property value' : `${result.yield.toFixed(2)}%`;
  const cards = compareScenarios(currentInput).map(scenario => {
    const card = document.createElement('div');
    card.className = 'scenario-card' + (scenario.id === 'base' ? ' is-base' : '');
    const name = document.createElement('span'); name.textContent = scenario.name;
    const amount = document.createElement('strong'); amount.textContent = currency(scenario.result.net / divisor);
    const assumptions = document.createElement('small'); assumptions.textContent = `${currency(scenario.assumptions.nightly)}/night · ${scenario.assumptions.occupancy}% occupied`;
    card.append(name, amount, assumptions);
    return card;
  });
  $('#scenario-cards').replaceChildren(...cards);
  $('#saved-comparison').hidden = !savedPlan;
  if (savedPlan) {
    $('#saved-description').textContent = `${savedPlan.property} · ${currency(savedPlan.input.nightly)}/night · ${savedPlan.input.occupancy}% occupancy`;
    $('#saved-net').textContent = currency(savedPlan.result.net / divisor);
    const difference = (result.net - savedPlan.result.net) / divisor;
    $('#saved-difference').textContent = `${difference > 0 ? '+' : ''}${currency(difference)}`;
  }
}
$('#save-plan').addEventListener('click', () => {
  if (!currentResult) return;
  savedPlan = { property: propertySummary(), input: { ...currentInput }, result: currentResult };
  renderPlan();
  $('#planner-status').textContent = 'Scenario saved for comparison in this page session. Change any input to compare.';
});
$('#clear-saved').addEventListener('click', () => { savedPlan = null; renderPlan(); $('#save-plan').focus({ preventScroll: true }); });
$('#export-plan').addEventListener('click', () => {
  if (!currentResult) return;
  const rows = [
    ['GemStay illustrative revenue plan', 'Example assumptions; not live market data'],
    ['Property', propertySummary()], ['Currency', 'AED'],
    ['Average nightly rate', currentInput.nightly], ['Occupancy (%)', currentInput.occupancy],
    ['Owner nights / year', currentInput.ownerNights], ['Average booking nights', currentInput.averageStay],
    ['Management fee (%)', currentInput.managementFee], ['Platform fee (%)', currentInput.platformFee],
    ['Utilities / month', currentInput.utilities], ['Maintenance / month', currentInput.maintenance],
    ['Owner-paid cleaning / booking', currentInput.cleaning], ['Other costs / year', currentInput.otherAnnual],
    ['Property value', currentInput.propertyValue], [], ['Metric', 'Annual AED', 'Monthly average AED'],
    ['Booking revenue', currentResult.gross, currentResult.gross / 12],
    ...Object.entries(currentResult.costs).map(([name, value]) => [name, value, value / 12]),
    ['Total entered costs', currentResult.totalCosts, currentResult.totalCosts / 12],
    ['Income after entered costs', currentResult.net, currentResult.net / 12],
    ['Annual operating yield (%)', currentResult.yield ?? 'Property value not entered'],
    ['Break-even occupancy (%)', currentResult.breakEven ?? 'Not achievable'], [],
    ['Scenario', 'Annual income AED', 'Nightly rate AED', 'Occupancy (%)'],
    ...compareScenarios(currentInput).map(s => [s.name, s.result.net, s.assumptions.nightly, s.assumptions.occupancy]),
    ['Excludes', 'Financing, acquisition costs and taxes. Monthly results are annual averages.'],
  ];
  if (savedPlan) rows.push([], ['Saved scenario', savedPlan.property], ['Saved annual income AED', savedPlan.result.net], ['Annual income change AED', currentResult.net - savedPlan.result.net]);
  const csv = rows.map(row => row.map(value => `"${String(typeof value === 'number' ? Math.round(value * 100) / 100 : value).replaceAll('"', '""')}"`).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = 'gemstay-revenue-plan.csv'; document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  $('#planner-status').textContent = 'Revenue plan downloaded as a CSV file.';
});

// Header, side index and phone menu share the page's chapters. The side index also includes owner steps that sit inside the owners chapter.
const navigationDialog = $('#navigation-dialog');
const navigationOpeners = [...document.querySelectorAll('[data-open-menu]')];
const headerNavLinks = [...document.querySelectorAll('#main-nav a')];
const sectionLinks = [...document.querySelectorAll('#main-nav a, .scroll-nav-links a, .mobile-nav-links a')];
const desktopSectionLinks = [...document.querySelectorAll('.scroll-nav-links a')];
const trackedIds = new Set(sectionLinks.map(link => link.hash.slice(1)).filter(Boolean));
const trackedSections = [...document.querySelectorAll('main [id]')].filter(section => trackedIds.has(section.id));
const darkNavigationSurfaces = [...document.querySelectorAll('.surface-dark')];
const compactNavigation = matchMedia('(max-width: 1179px)');
let scrollFrame = null;

function headerLinkFor(activeId) {
  const index = trackedSections.findIndex(section => section.id === activeId);
  if (index < 0) return null;
  let match = null;
  for (const link of headerNavLinks) {
    const targetIndex = trackedSections.findIndex(section => section.id === link.hash.slice(1));
    if (targetIndex !== -1 && targetIndex <= index) match = link;
  }
  return match;
}

function updateNavigation() {
  scrollFrame = null;
  const headerPassed = $('.site-header').getBoundingClientRect().bottom <= 0;
  $('#scroll-navigation').hidden = !headerPassed || compactNavigation.matches;
  $('.mobile-dock').hidden = !headerPassed || !compactNavigation.matches;
  const atPageEnd = Math.ceil(scrollY + innerHeight) >= document.documentElement.scrollHeight - 2;
  const passed = trackedSections.filter(section => section.getBoundingClientRect().top <= innerHeight * 0.3);
  const active = atPageEnd ? trackedSections.at(-1) : passed.at(-1);
  const headerActive = active ? headerLinkFor(active.id) : null;
  for (const link of sectionLinks) {
    const inHeader = Boolean(link.closest('#main-nav'));
    const current = inHeader ? link === headerActive : link.hash === `#${active?.id ?? ''}`;
    link.classList.toggle('is-active', current);
    if (current) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
    if (inHeader) link.classList.toggle('nav-active', current);
  }
  if (headerPassed && !compactNavigation.matches) {
    const darkBounds = darkNavigationSurfaces.map(section => section.getBoundingClientRect());
    for (const link of desktopSectionLinks) {
      const box = link.getBoundingClientRect();
      const middle = box.top + box.height / 2;
      link.classList.toggle('is-on-dark', darkBounds.some(bounds => middle >= bounds.top && middle < bounds.bottom));
    }
  }
}
function queueNavigationUpdate() {
  if (scrollFrame === null) scrollFrame = requestAnimationFrame(updateNavigation);
}
window.addEventListener('scroll', queueNavigationUpdate, { passive: true });
window.addEventListener('resize', queueNavigationUpdate, { passive: true });
new ResizeObserver(queueNavigationUpdate).observe(document.body);
updateNavigation();

function closeMenu() {
  if (navigationDialog.open) navigationDialog.close();
}
navigationOpeners.forEach(button => button.addEventListener('click', () => {
  navigationDialog.showModal();
  document.body.classList.add('modal-open');
  navigationOpeners.forEach(opener => opener.setAttribute('aria-expanded', 'true'));
}));
$('.navigation-close').addEventListener('click', closeMenu);
navigationDialog.addEventListener('close', () => {
  syncModalState();
  navigationOpeners.forEach(opener => opener.setAttribute('aria-expanded', 'false'));
});
navigationDialog.addEventListener('click', (event) => {
  const box = navigationDialog.getBoundingClientRect();
  if (event.target === navigationDialog && (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom)) closeMenu();
});
$('.mobile-nav-links').addEventListener('click', (event) => {
  const link = event.target.closest('a');
  if (!link) return;
  const destination = document.querySelector(link.getAttribute('href'));
  if (!destination) return;
  event.preventDefault();
  closeMenu();
  // Closing the dialog returns focus to the menu button and would undo the jump.
  requestAnimationFrame(() => {
    destination.scrollIntoView({ block: 'start', behavior: 'instant' });
    history.pushState(null, '', link.hash);
    destination.setAttribute('tabindex', '-1');
    destination.focus({ preventScroll: true });
  });
});
compactNavigation.addEventListener('change', () => {
  if (!compactNavigation.matches) closeMenu();
  queueNavigationUpdate();
});

const dialog = $('#contact-dialog');
document.querySelectorAll('[data-contact]').forEach((button) => button.addEventListener('click', () => {
  closeMenu();
  closePlanner();
  if (plannerInitialized) $('#contact-property').value = propertySummary();
  $('#contact-status').textContent = '';
  dialog.showModal();
  document.body.classList.add('modal-open');
}));
$('.dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', (event) => {
  const box = dialog.getBoundingClientRect();
  if (event.target === dialog && (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom)) dialog.close();
});
dialog.addEventListener('close', syncModalState);
$('#contact-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const name = $('#contact-name').value.trim();
  const email = $('#contact-email').value.trim();
  const property = $('#contact-property').value.trim();
  if (!name || !property) {
    $('#contact-status').textContent = 'Please add your name and a few details about your property.';
    return;
  }
  let message = `Hello GemStay,\n\nI'd like to arrange a property consultation.\n\nName: ${name}\nEmail: ${email}\nProperty: ${property}`;
  if (plannerInitialized && currentResult) message += `\n\nIllustrative scenario (${propertySummary()}):\nNightly rate: AED ${rate.value}; occupancy: ${occupancy.value}%.\nAnnual booking revenue: AED ${money(currentResult.gross)}.\nAnnual entered costs: AED ${money(currentResult.totalCosts)}.\nAnnual income after entered costs: AED ${money(currentResult.net)}.\nOwner nights: ${currentInput.ownerNights}; average booking: ${currentInput.averageStay} nights.\nManagement: ${currentInput.managementFee}%; platforms: ${currentInput.platformFee}%; utilities: AED ${currentInput.utilities}/month; maintenance: AED ${currentInput.maintenance}/month; cleaning: AED ${currentInput.cleaning}/booking; other: AED ${currentInput.otherAnnual}/year.\nExample assumptions; excludes financing, taxes and acquisition costs.`;
  message += '\n\nPlease get in touch to discuss my property. Thank you.';
  window.location.href = `mailto:hello@gemstay.ae?subject=${encodeURIComponent('Property consultation — ' + name)}&body=${encodeURIComponent(message)}`;
  $('#contact-status').textContent = 'Your email app will open with a draft. Please review and send it there. If it does not open, contact hello@gemstay.ae or use WhatsApp below.';
});

const bookingForm = $('#booking-form');
const checkIn = $('#check-in');
const checkOut = $('#check-out');
const bookingError = $('#booking-error');
const bookingNights = $('#booking-nights');
const localISO = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const plusDay = isoDate => {
  const date = new Date(`${isoDate}T00:00:00`);
  date.setDate(date.getDate() + 1);
  return localISO(date);
};
checkIn.min = localISO(new Date());
function syncBookingDates() {
  checkOut.min = checkIn.value ? plusDay(checkIn.value) : plusDay(checkIn.min);
  if (checkOut.value && checkIn.value && checkOut.value <= checkIn.value) checkOut.value = '';
  if (checkIn.value && checkOut.value) {
    const nights = Math.round((new Date(`${checkOut.value}T00:00:00`) - new Date(`${checkIn.value}T00:00:00`)) / 86400000);
    bookingNights.textContent = `${nights} ${nights === 1 ? 'night' : 'nights'} · `;
    bookingError.hidden = true;
  } else bookingNights.textContent = '';
}
checkIn.addEventListener('change', syncBookingDates);
checkOut.addEventListener('change', syncBookingDates);
syncBookingDates();
bookingForm.addEventListener('submit', event => {
  syncBookingDates();
  if (!checkIn.value || !checkOut.value) {
    event.preventDefault();
    bookingError.hidden = false;
    bookingError.textContent = 'Choose a check-in and a check-out date.';
    (checkIn.value ? checkOut : checkIn).focus();
  }
});
