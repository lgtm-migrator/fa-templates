import $ from 'jquery';
import _ from 'lodash';
import './css/main.scss';
import './css/style.scss';
import Assets from './assets/assets';
import {escapeHtml, handleConsoleMessage} from './lib/utils';
import {FollowAnalyticsWrapper} from './lib/FollowAnalyticsWrapper';

const setActivePage = (index) => {
  currentPage = index;
  $('.page').each((_idx, node) => {
    node.removeAttribute('class');
    node.className = 'page';
  });
  for (let i = 0; i < totalPages; i++) {
    const page = $(`#page-${i}`);
    if (i < index) page.addClass('page--previous');
    if (i === index) page.addClass('page--current');
    if (i > index) page.addClass('page--next');
  }
}

let currentPage = 0;
let totalPages = 0;
let inappClosed = false;

$(window).on('load', () => {
  try {
    const FollowAnalytics = new FollowAnalyticsWrapper().FollowAnalytics;
    if (typeof FollowAnalyticsParams === 'undefined') {
      throw {severity: 'warning', message: 'Missing template parameters, shutting down.'};
    }

    // Global configs
    const templateContainer = $('.template');

    // Total size = # of questionnaire pages + final page
    totalPages = _.size(FollowAnalyticsParams.pages) + 1;

    // Page configs
    const allPages = [...FollowAnalyticsParams.pages, ...FollowAnalyticsParams.final_page];
    _.forEach(allPages, (page, index) => {
      // Background config
      const pageContainer = $(`<div id="page-${index}" class="page" />`)
      pageContainer.css({backgroundColor: page.background.color});

      // Close button configs
      const closeButtonHtml = $('<div class="page__close">');
      closeButtonHtml.html(Assets.icoClose);
      closeButtonHtml.find('svg').css({fill: page.close_button.color});
      closeButtonHtml.on('click', () => {
        if (!inappClosed) {
          if (FollowAnalytics.CurrentCampaign.logAction) {
            FollowAnalytics.CurrentCampaign.logAction(`Page ${index + 1}: Dismiss`);
          }
          $('.deeplinkFrame').removeAttr('style');
          $('body').removeClass('overlay');
          $('body').find('.page__close').remove();
          setTimeout(() => FollowAnalytics.CurrentCampaign.close(), 700);
        }
      });
      pageContainer.append(closeButtonHtml);

      // Uploaded image config
      if (!!page.image.upload) {
        const imageHtml = $(`<img class="page__image" src="${page.image.upload}" alt="" />`);
        pageContainer.append(imageHtml);
      }

      const pageInfoContainer = $('<div class="page__info" />')

      // Title text configs
      const titleContainer = $('<div class="page__info__title" />');
      const titleHtml = $('<span />');
      titleHtml.text(page.title.text);
      titleHtml.css({color: page.title.color});
      titleContainer.append(titleHtml);
      pageInfoContainer.append(titleContainer);

      // Body text configs
      if (page.body.text !== '') {
        const bodyContainer = $('<div class="page__info__body" />');
        const bodyHtml = $('<span />');
        bodyHtml.html(escapeHtml(page.body.text));
        bodyHtml.css({color: page.body.color});
        bodyContainer.append(bodyHtml);
        pageInfoContainer.append(bodyContainer);
      }

      const buttonsContainer = $('<div class="page__info__buttons" />');
      _.forEach(page.buttons, (btn) => {
        const buttonHtml = $(`<div class="surveyButton"><span>${btn.text}</span></div>`);
        buttonHtml.css({
          backgroundColor: btn.background,
          borderColor: btn.border,
          color: btn.text_color,
        });

        buttonHtml.on('click', (_event) => {
          if (FollowAnalytics.CurrentCampaign.logAction) {
            FollowAnalytics.CurrentCampaign.logAction(`Page ${index + 1}: ${btn.text}`);
          }
          // Close on last page clicks
          if (currentPage === totalPages - 1 && btn.deeplink_url !== '') {
            if (FollowAnalyticsWrapper.checkMinSdkVersion(6, 3, 0)) {
              window.location.href = btn.deeplink_url;
            }
            else {
              const deeplinkIframe = $(`
                <iframe
                  src="${btn.deeplink_url}"
                  class="deeplinkFrame"
                  sandbox="allow-same-origin allow-scripts"
                  frameborder="0">
                </iframe>
              `);
              deeplinkIframe.on('load', () => {
                deeplinkIframe.css({transform: 'scale(1)'});
                // Wait for the animation of the iframe to end
                // Before showing the close button
                setTimeout(() => $('body').prepend(closeButtonHtml), 700);
              });
              $('body').prepend(deeplinkIframe);
            }
          }
          else if (currentPage === totalPages - 1 && !inappClosed) {
            inappClosed = true;
            $('body').removeClass('overlay');
            setTimeout(() => FollowAnalytics.CurrentCampaign.close(), 700);
          }
          // Otherwise go to next page
          else setActivePage(currentPage + 1);
        });
        buttonsContainer.append(buttonHtml);
      });
      pageInfoContainer.append(buttonsContainer);
      pageContainer.append(pageInfoContainer);

      // Page number config
      const pageNumberHtml = $(`<div class="page__pageNumber">${index + 1}/${totalPages}</div>`);
      pageNumberHtml.css({color: page.page_indicator.color});
      pageContainer.append(pageNumberHtml);

      templateContainer.append(pageContainer);
    });

    setActivePage(currentPage);
    setTimeout(() => $('body').addClass('overlay'), 400);
  }
  catch (e) {
    handleConsoleMessage(e);
  }
});