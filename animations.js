const textElement = document.querySelector(".animation");
console.log(textElement);
const text = "Don't keep your secrets, share them anonymously!";
let index = 0;

function type_effect() {
  textElement.innerHTML += text[index]; 
  index++; 
  if (index >= text.length) {
    clearInterval(intervalId); 
  }
}

const intervalId = setInterval(type_effect, 80); 







