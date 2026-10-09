import { captureAttribution } from './attribution';
import { trackFormView, trackWhatsAppClicks } from './tracking';
import { initCarousel, initMobileMenu, initReveal } from './ui';
import { initQuoteForm } from './form';
import { initThanks } from './thanks';

captureAttribution();
initReveal();
initMobileMenu();
initCarousel();
initQuoteForm();
initThanks();
trackWhatsAppClicks();
trackFormView();
