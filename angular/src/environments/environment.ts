import config from '../../../config.json';

const siteConfig = config['SITE'] || {};

export const environment = {
  title: siteConfig.name,
  organization: siteConfig.organization_name,
  group: siteConfig.group_name,
  copyright: siteConfig.copyright
};
