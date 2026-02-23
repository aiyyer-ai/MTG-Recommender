let jsonData;
let averageData;
let relatedTagData;

window.onload = async () => {
      jsonData = await pullLocalData(`./data/cardData.json?cache_buster=${Date.now()}`);
      averageData = await pullLocalData(`./data/averageDeckTags.json?cache_buster=${Date.now()}`);
      relatedTagData = await pullLocalData(`./data/liftData.json?cache_buster=${Date.now()}`);
      let inputField = document.getElementById('urlInput');
      let errorText = document.getElementById('errorText');
      inputField.addEventListener('keydown', function (event) {
            if (event.key === 'Enter') {
                  event.preventDefault();
                  errorText.innerHTML = ``;
                  let sideBar = document.getElementById(`sideData`);
                  sideBar.open = false;
                  sideBar.style.width = `0px`;
                  sideBar.style.marginRight = `0px`;
                  sideBar.innerHTML = ``;
                  if (!inputField.value) {
                        showInputError();
                        return;
                  }
                  if (inputField.value.includes(`archidekt`)) {
                        findArchidektDeck(inputField.value);
                  } else if (inputField.value.includes(`moxfield`)) {
                        findMoxfieldDeck(inputField.value);
                  } else {
                        showInputError();
                        return;
                  }
            }
      });
}

function showInputError() {
      let errorText = document.getElementById('errorText');
      errorText.innerHTML = `There was an error loading the deck!`;
}

async function findMoxfieldDeck(deckURL) {
      let deckID = deckURL.split(`/`).at(-1);
      if (!deckID) {
            showInputError();
            return;
      }
      let siteString = `https://api2.moxfield.com/v3/decks/all/${deckID}`;
      let deckData = await getData(siteString);
      if (!deckData) {
            showInputError();
            return;
      }
      let commanderDiv = document.getElementById(`commanderData`);
      let commanderTagDiv = document.getElementById(`commanderTags`);
      let commanderTagTitleDiv = document.getElementById(`commanderTagsTitle`);
      let graphDiv = document.getElementById(`graphData`);
      commanderDiv.innerHTML = ``;
      if (commanderDiv.colorIdentity) {
            commanderDiv.colorIdentity = ``;
      }
      commanderTagDiv.innerHTML = ``;
      commanderTagTitleDiv.innerHTML = `<span class="basicText largeText">Commander Tags</span>`;
      if (commanderTagDiv.commanderUIDs) {
            commanderTagDiv.commanderUIDs = [];
      }
      commanderTagDiv.style.height = ``;
      graphDiv.innerHTML = ``;
      graphDiv.style.height = ``;
      let cardUIDs = [];
      if (deckData.boards.commanders.count) {
            for (commanderData of Object.values(deckData.boards.commanders.cards)) {
                  if (Object.values(deckData.boards.commanders.cards).indexOf(commanderData) > 1) {
                        break;
                  }
                  let commanderUID = commanderData.card.scryfall_id;
                  let scryfallData = await getData(`https://api.scryfall.com/cards/${commanderUID}`);
                  cardUIDs.push(commanderUID);
                  commanderDiv.colorIdentity = scryfallData.color_identity;
                  let commanderPosition = Object.values(deckData.boards.commanders.cards).indexOf(commanderData) + 1;
                  let div;
                  if(scryfallData.card_faces) {
                        div = await addImg(scryfallData.card_faces[0].image_uris.large, commanderDiv);
                  } else {
                        div = await addImg(scryfallData.image_uris.large, commanderDiv);
                  }
                  div.style.width = `300px`;
                  div.classList.add(`card`);
                  if (deckData.boards.commanders.count > 1) {
                        let commanderHolder = document.getElementById(`commanderImageHolder`);
                        if(!commanderHolder) {
                              commanderHolder = document.createElement(`div`);
                              commanderHolder.id = `commanderImageHolder`;
                              commanderHolder.appendChild(commanderDiv.children[0]);
                              commanderDiv.appendChild(commanderHolder);
                              commanderHolder.totalHeight = 379;
                        }
                        div.classList.add(`placement${commanderPosition}`, `position`);
                        commanderHolder.appendChild(div);
                        commanderHolder.totalHeight += 45;
                        commanderHolder.style.width = `350px`;
                        commanderHolder.style.height = `${commanderHolder.totalHeight}px`;
                  }
                  if (!commanderTagDiv.commanderUIDs) {
                        commanderTagDiv.commanderUIDs = [];
                  }
                  commanderTagDiv.commanderUIDs.push(commanderUID);
            }
      }
      for (cardData of Object.values(deckData.boards.mainboard.cards)) {
            cardUIDs.push(cardData.card.scryfall_id);
      }
      let entries = getTagsFromUIDs(cardUIDs, jsonData);
      let significantEntries = calculateZScore(entries, averageData);
      makeGraphFromTags(significantEntries);
}

async function findArchidektDeck(deckURL) {
      let deckID = deckURL.split(`/`).filter(item => /^\d+$/.test(item))[0];
      if (!deckID) {
            showInputError();
            return;
      }
      let siteString = `https://archidekt.com/api/decks/${deckID}/`;
      let deckData = await getData(siteString);
      if (!deckData) {
            showInputError();
            return;
      }
      let commanderDiv = document.getElementById(`commanderData`);
      let commanderTagDiv = document.getElementById(`commanderTags`);
      let commanderTagTitleDiv = document.getElementById(`commanderTagsTitle`);
      let graphDiv = document.getElementById(`graphData`);
      commanderDiv.innerHTML = ``;
      if (commanderDiv.colorIdentity) {
            commanderDiv.colorIdentity = ``;
      }
      commanderTagDiv.innerHTML = ``;
      commanderTagTitleDiv.innerHTML = `<span class="basicText largeText">Commander Tags</span>`;
      if (commanderTagDiv.commanderUIDs) {
            commanderTagDiv.commanderUIDs = [];
      }
      commanderTagDiv.style.height = ``;
      graphDiv.innerHTML = ``;
      graphDiv.style.height = ``;
      let cardUIDs = [];
      let hasCommander = 0;
      let totalCommanderCount = deckData.cards.filter((item) => item.categories.includes("Commander")).length;
      for (cardData of deckData.cards) {
            if (!cardData.categories.includes("Maybeboard") && !cardData.categories.includes("Sideboard")) {
                  cardUIDs.push(cardData.card.uid);
            }
            if (cardData.categories.includes("Commander") && hasCommander < 2) {
                  hasCommander++;
                  let scryfallData = await getData(`https://api.scryfall.com/cards/${cardData.card.uid}`);
                  if (commanderDiv.colorIdentity) {
                        commanderDiv.colorIdentity = [...new Set([...commanderDiv.colorIdentity, ...scryfallData.color_identity])];
                  } else {
                        commanderDiv.colorIdentity = scryfallData.color_identity;
                  }
                  let commanderCount = hasCommander;
                  let div;
                  if(scryfallData.card_faces) {
                        div = await addImg(scryfallData.card_faces[0].image_uris.large, commanderDiv);
                  } else {
                        div = await addImg(scryfallData.image_uris.large, commanderDiv);
                  }
                  div.style.width = `300px`;
                  div.classList.add(`card`);
                  if (totalCommanderCount > 1) {
                        let commanderHolder = document.getElementById(`commanderImageHolder`);
                        if(!commanderHolder) {
                              commanderHolder = document.createElement(`div`);
                              commanderHolder.id = `commanderImageHolder`;
                              commanderHolder.appendChild(commanderDiv.children[0]);
                              commanderDiv.appendChild(commanderHolder);
                              commanderHolder.totalHeight = 379;
                        }
                        div.classList.add(`placement${commanderCount}`, `position`);
                        commanderHolder.appendChild(div);
                        commanderHolder.totalHeight += 45;
                        commanderHolder.style.width = `350px`;
                        commanderHolder.style.height = `${commanderHolder.totalHeight}px`;
                  }
                  if (!commanderTagDiv.commanderUIDs) {
                        commanderTagDiv.commanderUIDs = [];
                  }
                  commanderTagDiv.commanderUIDs.push(cardData.card.uid);
            }
      }
      let entries = getTagsFromUIDs(cardUIDs, jsonData);
      let significantEntries = calculateZScore(entries, averageData);
      makeGraphFromTags(significantEntries);
}

function calculateZScore(tagArray, averageDict) {
      let importantTags = [];

      for (tagData of tagArray) {
            let tagName = tagData[0];
            let tagCount = tagData[1];
            if (!averageDict[tagName]) {
                  importantTags.push(tagData);
                  continue;
            }
            let zScore = (tagCount - averageDict[tagName].average) / averageDict[tagName].stdDev;
            if (zScore > 1.96) {
                  importantTags.push(tagData);
            }
      }

      return importantTags;
}

function getTagsFromUIDs(UIDArray, tagArray) {
      let allTags = [];
      for (cardUID of UIDArray) {
            if (tagArray[cardUID] && tagArray[cardUID].length) {
                  allTags.push(tagArray[cardUID]);
            }
      }
      const frequencyMap = allTags.flat().reduce((accumulator, currentValue) => {
            accumulator[currentValue] = (accumulator[currentValue] || 0) + 1;
            return accumulator;
      }, {});
      let entries = Object.entries(frequencyMap).filter((item) => item[1] > 2);
      if (!entries.length) {
            entries = Object.entries(frequencyMap);
      }
      entries.sort((a, b) => b[1] - a[1]);
      return entries;
}

function fillSideBar(tagName) {
      let sideBar = document.getElementById(`sideData`);
      let linkIcon = `🡕`;
      let tagTitle = document.createElement(`span`);
      tagTitle.classList.add(`titleText`, `basicText`);
      tagTitle.textContent = tagName;

      let titleLink = document.createElement(`span`);
      titleLink.classList.add(`titleText`, `basicText`, `link-gray`);
      titleLink.textContent = linkIcon;
      openScryfallWindow(titleLink, tagName);

      let titleHolder = document.createElement(`div`);
      titleHolder.appendChild(tagTitle);
      titleHolder.appendChild(titleLink);
      titleHolder.style.marginTop = `50px`;

      sideBar.appendChild(titleHolder);

      let relatedTitle = document.createElement(`span`);
      relatedTitle.classList.add(`largeText`, `basicText`, `textLeft`, `position`);
      relatedTitle.textContent = `Related Tags:`;

      let relatedHolder = document.createElement(`div`);
      relatedHolder.classList.add(`relatedTagHolder`);
      relatedHolder.appendChild(relatedTitle);

      sideBar.appendChild(relatedHolder);

      let relatedTags = relatedTagData.filter(data => {
            if (data.tag == tagName && Number(data.confidence) >= 0.1 && Number(data.lift) >= 2) {
                  return true;
            }
            return false;
      });
      relatedTags.sort((a, b) => Number(b.lift) - Number(a.lift));

      let dataScroller = document.createElement(`div`);
      dataScroller.classList.add(`flexContainer`, `column`, `centeredFlex`, `noGap`);
      dataScroller.style.overflow = `auto`;
      dataScroller.style.width = `100%`;
      dataScroller.style.height = `100%`;
      for (tag of relatedTags) {
            let newTagDiv = document.createElement(`span`);
            newTagDiv.classList.add(`basicText`, `textLeft`, `position`, `paddingRight`);
            newTagDiv.textContent = tag.relatedTag;

            let newTagLift = document.createElement(`span`);
            newTagLift.classList.add(`basicText`, `textRight`, `position`, `paddingLeft`);
            newTagLift.textContent = Number(tag.lift).toFixed(2);

            let horizontalRule = document.createElement('div');
            horizontalRule.classList.add(`horizontalRule`, `position`);

            let dataHolder = document.createElement(`div`);
            dataHolder.classList.add(`barHolder`, `link-gray`);
            dataHolder.appendChild(horizontalRule);
            dataHolder.appendChild(newTagDiv);
            dataHolder.appendChild(newTagLift);
            openScryfallWindow(dataHolder, tag.relatedTag);

            dataScroller.appendChild(dataHolder);
      }
      sideBar.appendChild(dataScroller);

      let scrollerBounds = dataScroller.getBoundingClientRect();
      dataScroller.style.height = (window.innerHeight * 0.95) - scrollerBounds.top - 25 + "px";
}

function openScryfallWindow(div, tagName) {
      let scryfallLink = `https://scryfall.com/search?q=`;
      let commanderDiv = document.getElementById(`commanderData`);
      scryfallLink += `otag%3A${tagName}+id%3A${commanderDiv.colorIdentity.join("")}+f%3Acommander`;
      div.onclick = function () {
            window.open(scryfallLink, '_blank');
      }
}

function assignClickability(tagDiv) {
      tagDiv.onclick = function () {
            let sideBar = document.getElementById(`sideData`);
            if (sideBar.open && sideBar.currentTag && sideBar.currentTag == tagDiv.textContent) {
                  sideBar.open = false;
                  sideBar.style.width = `0px`;
                  sideBar.style.marginRight = `0px`;
                  sideBar.innerHTML = ``;
            } else {
                  sideBar.open = true;
                  sideBar.style.width = `500px`;
                  sideBar.currentTag = tagDiv.textContent;
                  // sideBar.style.marginRight = `100px`;
                  sideBar.innerHTML = ``;
                  fillSideBar(tagDiv.textContent);
            }
      }
}

function makeGraphFromTags(tagArray) {
      let graphDiv = document.getElementById(`graphData`);
      let commanderTagDiv = document.getElementById(`commanderTags`);
      let commanderTagTitleDiv = document.getElementById(`commanderTagsTitle`);
      let commanderDiv = document.getElementById(`commanderData`);
      let largestValue = Math.round(Math.max(...tagArray.map(item => item[1])) / 0.8);
      if (commanderTagDiv.commanderUIDs) {
            let allTags = getTagsFromUIDs(commanderTagDiv.commanderUIDs, jsonData);
            for (tagData of allTags) {
                  //format of tagData: [tagName, tagCount]
                  let tagName = document.createElement(`span`);
                  tagName.classList.add(`basicText`, `link`);
                  tagName.textContent = tagData[0];

                  commanderTagDiv.appendChild(tagName);

                  assignClickability(tagName);

            }
      }
      for (tagData of tagArray) {
            //format of tagData: [tagName, tagCount]
            let tagName = document.createElement(`span`);
            tagName.classList.add(`basicText`, `textRight`, `position`, `link`);
            tagName.textContent = tagData[0];

            let tagCount = document.createElement(`span`);
            tagCount.classList.add(`basicText`, `textRight`, `position`);
            tagCount.textContent = tagData[1];

            let barRegion = document.createElement(`div`);
            barRegion.classList.add(`barHolder`);

            let bar = document.createElement(`div`);
            bar.classList.add(`bar`);
            barRegion.appendChild(bar);
            bar.appendChild(tagName);
            barRegion.appendChild(tagCount);
            graphDiv.appendChild(barRegion);
            bar.style.width = (tagData[1] / largestValue) * 100 + "%";
            if (tagName.getBoundingClientRect().width + 30 > bar.getBoundingClientRect().width) {
                  barRegion.appendChild(tagName);
                  tagName.classList.remove(`textRight`);
                  tagName.classList.remove(`textLeft`);
                  tagName.style.left = bar.getBoundingClientRect().width + "px";
            }
            assignClickability(tagName);
      }

      //createScroll

      let graphBounds = graphDiv.getBoundingClientRect();
      graphDiv.style.height = (window.innerHeight * 0.95) - graphBounds.top + "px";
      let tagBounds = commanderTagDiv.getBoundingClientRect();
      commanderTagDiv.style.height = (window.innerHeight * 0.95) - tagBounds.top + "px";
      
}

async function pullLocalData(url = false) {
      if (!url) {
            return false;
      }
      try {
            const response = await fetch(url);
            if (!response.ok) {
                  throw new Error(`Response status: ${response.status}`);
            }
            let result = await response.json();
            return result;
      } catch (error) {
            console.error(error.message);
      }
}

async function getData(url = false, getText = false) {
      if (!url) {
            return false;
      }
      url = `https://proxy.aiyyer.xyz/` + url;
      try {
            const response = await fetch(url);
            if (!response.ok) {
                  throw new Error(`Response status: ${response.status}`);
            }

            let result;
            if (!getText) {
                  result = await response.json();
            } else {
                  result = await response.text();
            }

            return result;
      } catch (error) {
            console.error(error.message);
      }
}

function addImg(src, parentElement) {
      return new Promise((resolve, reject) => {
            let newImg = new Image();
            if (src.includes(`https`)) {
                  newImg.src = src;
            } else {
                  newImg.src = `./images/${src}.webp`;
            }
            newImg.onerror = (e) => reject(e);
            newImg.decode().then(addToPage);
            newImg.setAttribute('draggable', false);
            function addToPage(event) {
                  let newDiv = document.createElement(`div`);
                  if (parentElement) {
                        parentElement.appendChild(newDiv);
                  }
                  newDiv.classList.add(`imgcontainer`);
                  newDiv.appendChild(newImg);
                  resolve(newDiv);
            }
      });
}

function getRandomIntInclusive(min, max) {
      min = Math.ceil(min);
      max = Math.floor(max);
      return Math.floor(Math.random() * (max - min + 1)) + min;
}