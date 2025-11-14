import { Page, expect, Response } from '@playwright/test';

/**
 * Test Helper Utilities
 * 
 * Common utility functions for Playwright tests
 * Following Context7 best practices for test utilities
 */

export class TestHelpers {
  /**
   * Wait for page to be fully loaded
   */
  static async waitForPageLoad(page: Page, timeout: number = 10000) {
    await page.waitForLoadState('networkidle', { timeout });
  }

  /**
   * Take screenshot with timestamp
   */
  static async takeScreenshot(page: Page, name: string) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await page.screenshot({ 
      path: `test-results/screenshots/${name}-${timestamp}.png`,
      fullPage: true 
    });
  }

  /**
   * Wait for element to be visible with custom timeout
   */
  static async waitForElementVisible(page: Page, selector: string, timeout: number = 10000) {
    await page.waitForSelector(selector, { state: 'visible', timeout });
  }

  /**
   * Wait for element to be hidden with custom timeout
   */
  static async waitForElementHidden(page: Page, selector: string, timeout: number = 10000) {
    await page.waitForSelector(selector, { state: 'hidden', timeout });
  }

  /**
   * Clear all browser storage
   */
  static async clearBrowserStorage(page: Page) {
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  }

  /**
   * Set browser storage value
   */
  static async setStorageValue(page: Page, key: string, value: string, storage: 'local' | 'session' = 'local') {
    await page.evaluate(({ key, value, storage }) => {
      if (storage === 'local') {
        localStorage.setItem(key, value);
      } else {
        sessionStorage.setItem(key, value);
      }
    }, { key, value, storage });
  }

  /**
   * Get browser storage value
   */
  static async getStorageValue(page: Page, key: string, storage: 'local' | 'session' = 'local'): Promise<string | null> {
    return await page.evaluate(({ key, storage }) => {
      if (storage === 'local') {
        return localStorage.getItem(key);
      } else {
        return sessionStorage.getItem(key);
      }
    }, { key, storage });
  }

  /**
   * Simulate network delay
   */
  static async simulateNetworkDelay(page: Page, delay: number = 1000) {
    await page.route('**/*', route => {
      setTimeout(() => route.continue(), delay);
    });
  }

  /**
   * Simulate network error
   */
  static async simulateNetworkError(page: Page, pattern: string = '**/api/**') {
    await page.route(pattern, route => route.abort());
  }

  /**
   * Simulate slow network
   */
  static async simulateSlowNetwork(page: Page) {
    await page.route('**/*', route => {
      setTimeout(() => route.continue(), 2000);
    });
  }

  /**
   * Mock API response
   */
  static async mockApiResponse(page: Page, url: string, response: any, status: number = 200) {
    await page.route(url, route => {
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(response)
      });
    });
  }

  /**
   * Wait for API call to complete
   */
  static async waitForApiCall(page: Page, url: string, timeout: number = 10000) {
    await page.waitForResponse(response => response.url().includes(url), { timeout });
  }

  /**
   * Get all API calls made
   */
  static async getApiCalls(page: Page, url: string): Promise<Response[]> {
    const responses: Response[] = [];
    page.on('response', response => {
      if (response.url().includes(url)) {
        responses.push(response);
      }
    });
    return responses;
  }

  /**
   * Verify element text content
   */
  static async verifyElementText(page: Page, selector: string, expectedText: string) {
    const element = page.locator(selector);
    await expect(element).toHaveText(expectedText);
  }

  /**
   * Verify element is visible
   */
  static async verifyElementVisible(page: Page, selector: string) {
    const element = page.locator(selector);
    await expect(element).toBeVisible();
  }

  /**
   * Verify element is hidden
   */
  static async verifyElementHidden(page: Page, selector: string) {
    const element = page.locator(selector);
    await expect(element).toBeHidden();
  }

  /**
   * Verify element has attribute
   */
  static async verifyElementAttribute(page: Page, selector: string, attribute: string, value: string) {
    const element = page.locator(selector);
    await expect(element).toHaveAttribute(attribute, value);
  }

  /**
   * Verify element has class
   */
  static async verifyElementClass(page: Page, selector: string, className: string) {
    const element = page.locator(selector);
    await expect(element).toHaveClass(new RegExp(className));
  }

  /**
   * Verify page title
   */
  static async verifyPageTitle(page: Page, expectedTitle: string) {
    await expect(page).toHaveTitle(expectedTitle);
  }

  /**
   * Verify page URL
   */
  static async verifyPageUrl(page: Page, expectedUrl: string | RegExp) {
    await expect(page).toHaveURL(expectedUrl);
  }

  /**
   * Verify page contains text
   */
  static async verifyPageContainsText(page: Page, text: string) {
    await expect(page.locator('body')).toContainText(text);
  }

  /**
   * Verify page does not contain text
   */
  static async verifyPageNotContainsText(page: Page, text: string) {
    await expect(page.locator('body')).not.toContainText(text);
  }

  /**
   * Wait for text to appear on page
   */
  static async waitForText(page: Page, text: string, timeout: number = 10000) {
    await page.waitForSelector(`text=${text}`, { timeout });
  }

  /**
   * Wait for text to disappear from page
   */
  static async waitForTextToDisappear(page: Page, text: string, timeout: number = 10000) {
    await page.waitForSelector(`text=${text}`, { state: 'hidden', timeout });
  }

  /**
   * Get element text content
   */
  static async getElementText(page: Page, selector: string): Promise<string> {
    const element = page.locator(selector);
    return await element.textContent() || '';
  }

  /**
   * Get element attribute value
   */
  static async getElementAttribute(page: Page, selector: string, attribute: string): Promise<string | null> {
    const element = page.locator(selector);
    return await element.getAttribute(attribute);
  }

  /**
   * Get element input value
   */
  static async getElementValue(page: Page, selector: string): Promise<string> {
    const element = page.locator(selector);
    return await element.inputValue();
  }

  /**
   * Fill input field
   */
  static async fillInput(page: Page, selector: string, value: string) {
    const element = page.locator(selector);
    await element.fill(value);
  }

  /**
   * Clear input field
   */
  static async clearInput(page: Page, selector: string) {
    const element = page.locator(selector);
    await element.clear();
  }

  /**
   * Click element
   */
  static async clickElement(page: Page, selector: string) {
    const element = page.locator(selector);
    await element.click();
  }

  /**
   * Select option from dropdown
   */
  static async selectOption(page: Page, selector: string, value: string) {
    const element = page.locator(selector);
    await element.selectOption(value);
  }

  /**
   * Check checkbox
   */
  static async checkCheckbox(page: Page, selector: string) {
    const element = page.locator(selector);
    await element.check();
  }

  /**
   * Uncheck checkbox
   */
  static async uncheckCheckbox(page: Page, selector: string) {
    const element = page.locator(selector);
    await element.uncheck();
  }

  /**
   * Hover over element
   */
  static async hoverElement(page: Page, selector: string) {
    const element = page.locator(selector);
    await element.hover();
  }

  /**
   * Double click element
   */
  static async doubleClickElement(page: Page, selector: string) {
    const element = page.locator(selector);
    await element.dblclick();
  }

  /**
   * Right click element
   */
  static async rightClickElement(page: Page, selector: string) {
    const element = page.locator(selector);
    await element.click({ button: 'right' });
  }

  /**
   * Press key
   */
  static async pressKey(page: Page, key: string) {
    await page.keyboard.press(key);
  }

  /**
   * Type text
   */
  static async typeText(page: Page, text: string) {
    await page.keyboard.type(text);
  }

  /**
   * Scroll to element
   */
  static async scrollToElement(page: Page, selector: string) {
    const element = page.locator(selector);
    await element.scrollIntoViewIfNeeded();
  }

  /**
   * Scroll to top of page
   */
  static async scrollToTop(page: Page) {
    await page.evaluate(() => window.scrollTo(0, 0));
  }

  /**
   * Scroll to bottom of page
   */
  static async scrollToBottom(page: Page) {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  }

  /**
   * Get page height
   */
  static async getPageHeight(page: Page): Promise<number> {
    return await page.evaluate(() => document.body.scrollHeight);
  }

  /**
   * Get viewport size
   */
  static async getViewportSize(page: Page) {
    return await page.viewportSize();
  }

  /**
   * Set viewport size
   */
  static async setViewportSize(page: Page, width: number, height: number) {
    await page.setViewportSize({ width, height });
  }

  /**
   * Get current URL
   */
  static async getCurrentUrl(page: Page): Promise<string> {
    return page.url();
  }

  /**
   * Navigate to URL
   */
  static async navigateToUrl(page: Page, url: string) {
    await page.goto(url);
    await this.waitForPageLoad(page);
  }

  /**
   * Reload page
   */
  static async reloadPage(page: Page) {
    await page.reload();
    await this.waitForPageLoad(page);
  }

  /**
   * Go back
   */
  static async goBack(page: Page) {
    await page.goBack();
    await this.waitForPageLoad(page);
  }

  /**
   * Go forward
   */
  static async goForward(page: Page) {
    await page.goForward();
    await this.waitForPageLoad(page);
  }

  /**
   * Wait for specific time
   */
  static async wait(ms: number) {
    await new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate random string
   */
  static generateRandomString(length: number = 10): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Generate random email
   */
  static generateRandomEmail(): string {
    const randomString = this.generateRandomString(8);
    return `${randomString}@test.com`;
  }

  /**
   * Generate random number
   */
  static generateRandomNumber(min: number = 1, max: number = 100): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}
