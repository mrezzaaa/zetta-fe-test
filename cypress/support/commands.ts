import addContext from 'mochawesome/addContext';
import * as CryptoJS from 'crypto-js';
import { environment } from 'environments/environment';

/// <reference types="cypress" />
// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })
//
declare global {
  namespace Cypress {
    interface Chainable {
      setLocalStorageItem(key: string, data: any): Chainable<void>;
      setUserProfile(): Chainable<void>;
      setPermissions(): Chainable<void>;
      login(email: string, password: string): Chainable<void>;
      getOneUser(email: string): any;
      drag(subject: string, options?: Partial<TypeOptions>): Chainable<Element>;
      dismiss(subject: string, options?: Partial<TypeOptions>): Chainable<Element>;
      visit(originalFn: CommandOriginalFn<any>, url: string, options: Partial<VisitOptions>): Chainable<Element>;
      getDataCy(selector: string, ...args: any[]): Chainable<JQuery<HTMLElement>>;
      saveLocalStorage(): Chainable<void>;
      restoreLocalStorage(): Chainable<void>;
      switchToEnLang(): Chainable<void>;
      switchToFrLang(): Chainable<void>;
      dragAndDropColumn(selectColumn: string, targetColumn: string): Chainable<void>;
    }
  }
}

Cypress.Commands.add('dragAndDropColumn', (selectColumn, targetColumn) => {
  cy.getDataCy(`${selectColumn}`).find('mat-icon[svgIcon="drag_indicator"]').trigger('mousedown', { button: 0, force: true });
  cy.getDataCy(`${targetColumn}`).trigger('mousemove', { button: 0, force: true });
  cy.getDataCy(`${targetColumn}`).trigger('mousemove', { button: 0, force: true });
  cy.getDataCy(`${targetColumn}`).trigger('mouseup', { force: true });
});

Cypress.Commands.add('setLocalStorageItem', (key, value) => {
  cy.window().then((window) => {
    window.localStorage.setItem(key, value);
  });
});

Cypress.Commands.add('getOneUser', (email) => {
  cy.session([email], () => {
    const data = JSON.stringify({
      query: `query GetOneUser {
        GetOneUser(email: "${email}") {
          entities {
            entity_name
            school_type
            group_of_schools {
              _id
            }
            school {
              _id
            }
            assigned_rncp_title {
              _id
            }
            class {
              _id
            }
            type {
              _id
              name
            }
          }
        }
      }
      `,
    });
    cy.request({
      url: 'https://api.features-v2.zetta-demo.space/graphql',
      method: 'post',
      body: data,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data?.length?.toString(),
      },
    }).then((response) => {
      let userResponse = response?.body?.data?.GetOneUser;
      return userResponse;
    });
  });
});

Cypress.Commands.add('setUserProfile', () => {
  cy.fixture('user-profile.json').then((data) => {
    cy.setLocalStorageItem('userProfile', JSON.stringify(data));
  });
});

Cypress.Commands.add('setPermissions', () => {
  cy.fixture('permissions.json').then((data) => {
    cy.setLocalStorageItem(environment.tokenKey, data?.token);
    cy.setLocalStorageItem('permissions', data?.permissions);
  });
});

Cypress.Commands.add('switchToEnLang', () => {
  cy.getDataCy('button-lang-dropdown').should('be.visible').click();
  cy.getDataCy('button-flag-en').should('be.visible').click();
  cy.wait(1000);
});

Cypress.Commands.add('switchToFrLang', () => {
  cy.getDataCy('button-lang-dropdown').should('be.visible').click();
  cy.getDataCy('button-flag-fr').should('be.visible').click();
  cy.wait(1000);
});

Cypress.Commands.add('login', (email, password) => {
  cy.session([email, password], () => {
    const data = JSON.stringify({
      query: `mutation Login($email: String $password: String) {
        Login(email: $email password: $password) {
          token
        }
      }`,
      variables: `{
        "email": "${email}",
        "password": "${password}"
      }`,
    });
    cy.request({
      url: 'https://api.features-v2.zetta-demo.space/graphql',
      method: 'post',
      body: data,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length.toString(),
      },
    }).then((response) => {
      cy.window().then((win) => win.localStorage.setItem('admtc-token-encryption', JSON.stringify(response.body.data.Login.token)));
    });
    cy.fixture('user-profile.json').then((userProfile) => {
      const permissions = CryptoJS.AES.encrypt(JSON.stringify(['ADMTC Director']), 'Key').toString();
      cy.window().then((win) => win.localStorage.setItem('userProfile', JSON.stringify(userProfile)));
      cy.window().then((win) => win.localStorage.setItem('permissions', permissions));
    });
  });
});

Cypress.Commands.add('getDataCy', (selector, ...args) => {
  return cy.get(`[data-cy="${selector}"]`, ...args);
});

const LOCAL_STORAGE_SNAPSHOT: { [key: string]: string } = {};

Cypress.Commands.add('saveLocalStorage', () => {
  cy.window().then((win) => {
    for (const key of Object.keys(localStorage)) {
      LOCAL_STORAGE_SNAPSHOT[key] = win.localStorage.getItem(key);
    }
  });
});

Cypress.Commands.add('restoreLocalStorage', () => {
  cy.window().then((win) => {
    for (const [key, value] of Object.entries(LOCAL_STORAGE_SNAPSHOT)) {
      win.localStorage.setItem(key, value);
    }
  });
});

Cypress.on('test:after:run', (test, runnable) => {
  const MAX_SPEC_NAME_LENGTH = 220;

  if (test.state === 'failed') {
    let item: any = runnable;
    const nameParts = [runnable.title];

    // Iterate through all parents and grab the titles
    while (item.parent) {
      nameParts.unshift(item.parent.title);
      item = item.parent;
    }

    const fullTestName = nameParts
      .filter(Boolean)
      .join(' -- ') // this is how cypress joins the test title fragments
      .slice(0, MAX_SPEC_NAME_LENGTH);

    const imageUrl = `screenshots/${Cypress.spec.name}/${fullTestName} (failed).png`;

    addContext({ test }, imageUrl);
  }
}); 