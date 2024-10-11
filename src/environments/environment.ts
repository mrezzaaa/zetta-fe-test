// The file for the current environment will overwrite this one during build.
// Different environments can be found in ./environment.{dev|prod}.ts, and
// you can create your own and use it with the --env flag.
// The build system defaults to the dev environment.

export const environment = {
  production: false,
  PDF_SERVER_URL: '',
  apiUrl: '',
  apiUrlTask: '',
  // local storage name to store  the token
  tokenKey: 'admtc-token-encryption',
  siteKey: '',
  timezoneDiff: 2,
  videoToolEnvironment: 'http://localhost:7520/',
  studentEnvironment : 'http://localhost:7520',
  formEnvironment : '',
  accorchageEnvironment : '',
  deskaideEnvironment : ''
};
