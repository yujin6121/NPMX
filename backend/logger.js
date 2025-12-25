import signale from 'signale';

const options = {
  displayDate: true,
  displayTimestamp: true,
  displayFilename: false,
  displayBadge: true,
};

export const global = new signale.Signale({
  ...options,
  scope: 'global',
});

export const ssl = new signale.Signale({
  ...options,
  scope: 'ssl',
});

export const nginx = new signale.Signale({
  ...options,
  scope: 'nginx',
});

export const db = new signale.Signale({
  ...options,
  scope: 'database',
});

export const debug = (logger, ...args) => {
  if (process.env.DEBUG === 'true') {
    logger.debug(...args);
  }
};
