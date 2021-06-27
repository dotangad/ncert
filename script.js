#!/usr/bin/env node

const puppeteer = require("puppeteer");
const inquirer = require("inquirer");
const htmlEntities = require("html-entities");
const { exec: execCallback } = require("child_process");
const { promisify } = require("util");
const exec = promisify(execCallback);

const URL = (path) => `https://ncert.nic.in/${path}`;

(async () => {
  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(URL("textbook.php"), {
      waitUntil: "networkidle0",
    });

    const classes = await page.evaluate(() => {
      return [...document.querySelectorAll('select[name="tclass"] option')]
        .map((x) => [x.value, x.innerHTML])
        .filter((x) => !!x[0] || !!x[1])
        .slice(1);
    });

    const selClass = await inquirer.prompt([
      {
        type: "list",
        name: "class",
        message: "Class",
        choices: classes.map((x) => htmlEntities.decode(x[1])),
      },
    ]);

    const selClassOption = classes.find(
      (x) => x[1] === htmlEntities.encode(selClass.class)
    )[0];

    await page.select('select[name="tclass"]', String(selClassOption));

    const subjects = await page.evaluate(() => {
      return [...document.querySelectorAll('select[name="tsubject"] option')]
        .map((x) => [x.value, x.innerHTML])
        .filter((x) => !!x[0] || !!x[1])
        .slice(1);
    });

    const selSubject = await inquirer.prompt([
      {
        type: "list",
        name: "subject",
        message: "Subject",
        choices: subjects.map((x) => htmlEntities.decode(x[1])),
      },
    ]);

    const selSubjectOption = subjects.find(
      (x) => x[1] === htmlEntities.encode(selSubject.subject)
    )[0];

    await page.select('select[name="tsubject"]', String(selSubjectOption));

    const textbooks = await page.evaluate(() => {
      return [...document.querySelectorAll('select[name="tbook"] option')]
        .map((x) => [x.value, x.innerHTML])
        .filter((x) => !!x[0] || !!x[1])
        .slice(1);
    });

    const { textbook } = await inquirer.prompt([
      {
        type: "list",
        name: "textbook",
        message: "Textbook",
        choices: textbooks.map((x) => htmlEntities.decode(x[1])),
      },
    ]);

    const textbookLink = textbooks.find(
      (x) => x[1] === htmlEntities.encode(textbook)
    )[0];

    await page.goto(URL(textbookLink), {
      waitUntil: "networkidle0",
    });

    const toc = await page.evaluate(() => {
      return [
        ...document
          .querySelector(
            // Yikes
            "#Layer1 > center > p > table:nth-child(2) > tbody > tr > td:nth-child(1) > div > table > tbody"
          )
          .querySelectorAll("tbody > tr > td > table > tbody > tr"),
      ]
        .map((x) => [...x.querySelectorAll("tr > td")])
        .map(([title, link]) => [
          link.querySelector("a").getAttribute("href"),
          title.innerText,
        ])
        .filter((x) => !!x[0] || !!x[1]);
    });

    const { section } = await inquirer.prompt([
      {
        type: "list",
        name: "section",
        message: "Section / Chapter",
        choices: toc.map((x) => htmlEntities.decode(x[1])),
      },
    ]);

    const sectionLink = toc.find(
      (x) => x[1] === htmlEntities.encode(section)
    )[0];

    await page.goto(URL(sectionLink), {
      waitUntil: "networkidle0",
    });

    const PDFLink = URL(
      await page.evaluate(() => {
        return document.querySelector("iframe").getAttribute("src");
      })
    );

    const filenameDef = PDFLink.split("/")[PDFLink.split("/").length - 1];
    const { filename } = await inquirer.prompt([
      {
        type: "input",
        name: "filename",
        message: "Save as",
        default: filenameDef,
      },
    ]);

    const { stderr } = await exec(`wget ${PDFLink} -O ${filename}.pdf`);

    if (!!stderr) {
      console.log("WGET Error");
      console.log(stderr);
    }

    await browser.close();
  } catch (e) {
    console.error(e);
  }
})();
