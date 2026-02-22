async function callArchidekt() {
      let importantFilters = {
            //The Deck's Commander
            "commanderName": "Isshin, Two Heavens as One",
            //Count of cards in deck
            "size": 100,
            //Format of deck [3 is commander]
            "deckFormat": 3
      }
      let siteString = `https://archidekt.com/api/decks/v3/?`;
      const usedFilters = Object.fromEntries(
            Object.entries(importantFilters).filter(([_, value]) => value)
      );
      const urlString = Object.entries(usedFilters)
            .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
            .join('&');
      siteString += urlString;
      let testData = await getData(siteString);
      console.log(testData);
      while (testData.next) {
            testData = await getData(testData.next);
            console.log(testData);
      }
}

async function callScryfall(filterText) {
      let siteString = `https://api.scryfall.com/cards/search?`;
      siteString += filterText;
      let jsonData = await getData(siteString);
      return jsonData;
}

async function scrapeTags() {
      let siteString = `https://scryfall.com/docs/tagger-tags`;
      let scrapedHTMLTagText = await getData(siteString, true);
      let parsedHTMLTag = parseHtml(scrapedHTMLTagText);
      let allTitles = parsedHTMLTag.querySelectorAll(`h2`);
      let functionalTitles = [...allTitles].filter((titleDiv) => {
            return titleDiv.innerHTML.includes(`functional`);
      });
      let tagTexts = functionalTitles.map((div) => {
            return div.nextElementSibling.innerText.split(div.nextElementSibling.firstChild.textContent).filter((element, index) => {
                  return index % 2 !== 0;
            });
      }).flat();
      let filterText = `q=oracletag%3A`;
      let tagDatabase = {};
      tagTexts.forEach(tag => {
            tagDatabase[tag] = [];
      });

      function simplifyCard(card) {
            return {
                  id: card.id,
                  name: card.name,
                  oracle_text: card.oracle_text,
                  type_line: card.type_line,
                  mana_cost: card.mana_cost,
                  cmc: card.cmc,
                  colors: card.colors,
                  color_identity: card.color_identity,
                  legalities: card.legalities
            };
      }
      console.log(tagTexts.length);
      let count = 0;
      for (const tag of tagTexts) {
            count++;
            console.log(count);
            let taggedCards = await callScryfall(`${filterText}${tag}`);
            if (taggedCards) {
                  tagDatabase[tag].push(...taggedCards.data.map(simplifyCard));
                  while (taggedCards.has_more) {
                        taggedCards = await callScryfall(taggedCards.next_page);
                        tagDatabase[tag].push(...taggedCards.data.map(simplifyCard));
                        await delay(100);
                  }
            }
            await delay(100);
      }

      const jsonTags = JSON.stringify(tagDatabase, null, 2);
      saveFile("cardTagsMTG.txt", jsonTags);
}

function delay(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
}

function parseHtml(htmlString) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlString, "text/html");
      return doc;
}

function saveFile(filename, content) {
      const blob = new Blob([content], { type: 'text/plain' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename; // Suggested file name
      link.style.display = 'none'; // Hide the link
      document.body.appendChild(link);
      link.click(); // Simulate a click to trigger download
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href); // Clean up the object URL
}


//deck yoinker

async function pullTagsFromArchidekt() {
      let allDeckIDs = await getLatestDeckIDs();
      let allDeckCards = await convertDeckIDsToCards(allDeckIDs);
      let allDeckTags = [];
      for (deckUIDs of allDeckCards) {
            let entries = getTagsFromUIDs(deckUIDs, jsonData);
            let dict = Object.fromEntries(entries);
            allDeckTags.push(dict);
      }
      let averageDeckTags = averageDictionaries(allDeckTags);
      const jsonTags = JSON.stringify(averageDeckTags, null, 2);
      saveFile("averageDeckTags.json", jsonTags);
}

function averageDictionaries(dicts) {
      const sums = {};
      const count = dicts.length;

      dicts.forEach(d => {
            for (const key in d) {
                  if (sums[key] === undefined) {
                        sums[key] = 0;
                  }
                  sums[key] += d[key];
            }
      });

      const averages = {};
      for (const key in sums) {
            averages[key] = Math.round(sums[key] / count);
      }

      const sumsOfSquaredDifferences = {};
      dicts.forEach(d => {
            for (const key in d) {
                  if (sumsOfSquaredDifferences[key] === undefined) {
                        sumsOfSquaredDifferences[key] = 0;
                  }
                  sumsOfSquaredDifferences[key] += Math.pow(d[key] - averages[key], 2);
            }
      });

      const AvgAndStdDevs = {};
      for (const key in sumsOfSquaredDifferences) {
            AvgAndStdDevs[key] = {
                  "average": averages[key],
                  "stdDev": Math.sqrt(sumsOfSquaredDifferences[key] / (count - 1))
            }
      }

      return AvgAndStdDevs;
}

function delay(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
}

async function getLatestDeckIDs() {
      let importantFilters = {
            //The Deck's Commander
            "commanderName": undefined,
            //Count of cards in deck
            "size": 100,
            //Format of deck [3 is commander]
            "deckFormat": 3
      }
      let siteString = `https://archidekt.com/api/decks/v3/?orderBy=-createdAt&`;
      const usedFilters = Object.fromEntries(
            Object.entries(importantFilters).filter(([_, value]) => value)
      );
      const urlString = Object.entries(usedFilters)
            .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
            .join('&');
      siteString += urlString;
      let allDeckIDs = [];
      let pageData = await getData(siteString);
      await delay(500);
      allDeckIDs.push(...pageData.results.map(item => item.id));
      while (pageData.next) {
            pageData = await getData(pageData.next);
            await delay(500);
            allDeckIDs.push(...pageData.results.map(item => item.id));
      }
      return allDeckIDs;
}

async function convertDeckIDsToCards(IDArray) {
      let deckArray = [];
      for (id of IDArray) {
            let siteString = `https://archidekt.com/api/decks/${id}/`;
            let deckData = await getData(siteString);
            if (!deckData) {
                  continue;
            }
            let cardUIDs = [];
            for (cardData of deckData.cards) {
                  if (!cardData.categories || (cardData.categories && !cardData.categories.includes("Maybeboard") && !cardData.categories.includes("Sideboard"))) {
                        cardUIDs.push(cardData.card.uid);
                  }
            }
            deckArray.push(cardUIDs);
            await delay(500);
      }
      return deckArray;
}

function saveFile(filename, content) {
      const blob = new Blob([content], { type: 'text/plain' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename; // Suggested file name
      link.style.display = 'none'; // Hide the link
      document.body.appendChild(link);
      link.click(); // Simulate a click to trigger download
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href); // Clean up the object URL
}