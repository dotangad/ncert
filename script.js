const puppeteer = require("puppeteer");
const inquirer = require("inquirer");
const htmlEntities = require("html-entities");

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto("https://ncert.nic.in/textbook.php", {
    waitUntil: "networkidle0",
  });
  await page.screenshot({ path: "example.png" });

  const classes = await page.evaluate(() => {
    return [...document.querySelectorAll('select[name="tclass"] option')]
      .map((x) => [x.value, x.innerHTML])
      .slice(1);
  });

  console.log({ classes });

  await browser.close();
})();
