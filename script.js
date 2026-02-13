window.onload = async () => {
      let testData = await getData(`https://archidekt.com/api/decks/v3/?deckFormat=3`);
      console.log(testData);
}

async function getData(url = false) {
      if (!url) {
            return false;
      }
      try {
            const response = await fetch(url);
            if (!response.ok) {
                  throw new Error(`Response status: ${response.status}`);
            }
            const result = await response.json();
            return result;
      } catch (error) {
            console.error(error.message);
      }
}

function addImg(src, parentElement, imgCallback) {
      let newImg = new Image();
      if (src.includes(`https`)) {
            newImg.src = src;
      } else {
            newImg.src = `./images/${src}.webp`;
      }
      newImg.onerror = () => {
            imgCallback(false);
      };
      newImg.onload = addToPage;
      newImg.setAttribute('draggable', false);
      function addToPage(event) {
            let newDiv = document.createElement(`div`);
            if (parentElement) {
                  parentElement.appendChild(newDiv);
            }
            newDiv.classList.add(`imgcontainer`);
            newDiv.appendChild(this);
            if (imgCallback) {
                  imgCallback(newDiv);
            }
      }
}

function getRandomIntInclusive(min, max) {
      min = Math.ceil(min);
      max = Math.floor(max);
      return Math.floor(Math.random() * (max - min + 1)) + min;
}