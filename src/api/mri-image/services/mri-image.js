'use strict';

/**
 * mri-image service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::mri-image.mri-image');
