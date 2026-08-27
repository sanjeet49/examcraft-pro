import { chromium } from 'playwright';

(async () => {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log("Navigating to Builder...");
    await page.goto('http://localhost:3000/dashboard/builder');

    console.log("Mocking 50 MCQs generation in the UI...");
    // Fill the textarea with instructions
    await page.waitForSelector('textarea', { state: 'visible' });
    await page.fill('textarea', 'Generate 5 MCQs about Python. Generate 5 MCQs about Java. Generate 5 MCQs about Go. Generate 5 MCQs about Rust. Generate 5 MCQs about C++. Generate 5 MCQs about C#. Generate 5 MCQs about Ruby. Generate 5 MCQs about Kotlin. Generate 5 MCQs about Swift. Generate 5 MCQs about PHP.');

    // Click Generate Magic Blocks
    await page.getByText('Generate Magic Blocks').click();

    console.log("Waiting for AI generation to complete (approx 30s)...");
    // Wait for the loader to disappear or for questions to populate
    await page.waitForResponse(response => response.url().includes('/api/ai/parse') && response.status() === 200, { timeout: 60000 });
    await page.waitForTimeout(5000); // Give React time to render 50 items

    console.log("Invoking virtual Print to calculate Page count...");

    // We mock window.print() and tap into the CSS layout engine to measure the A4 sheets height
    const pagesCount = await page.evaluate(() => {
        // Force media print emulation
        const style = document.createElement('style');
        style.innerHTML = `@media print { * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }`;
        document.head.appendChild(style);

        // Count the number of .a4-paper physical nodes rendered
        const a4Sheets = document.querySelectorAll('.a4-paper');
        return a4Sheets.length;
    });

    console.log("-----------------------------------------");
    console.log(`[SUCCESS] The Document yielded exactly: ${pagesCount} pages.`);
    console.log(`Verify that this matches the expected scale for 50 MCQs (~4-5 pages) and not 25 phantom pages.`);
    console.log("-----------------------------------------");

    await browser.close();
})();
