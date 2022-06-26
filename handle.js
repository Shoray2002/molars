const import_modal_button = document.getElementById("import-modal");
const close = document.getElementById("close");
const modal = document.querySelector(".modal");
const uploadFile_button = document.getElementById("uploadFile");
const uploadLink_button = document.getElementById("uploadLink");
const holder = document.getElementById("holder");
import_modal_button.addEventListener("click", function () {
  modal.style.display = "flex";
});
close.addEventListener("click", function () {
  modal.style.display = "none";
  holder.innerHTML = "";
});
window.addEventListener("keydown", function (event) {
  if (event.keyCode === 27) {
    close.click();
  }
});

uploadFile_button.addEventListener("click", function () {
  holder.innerHTML =
    '<input type="file" id="file" name="file" accept=".json" />';
});

uploadLink_button.addEventListener("click", function () {
  holder.innerHTML =
    '<input type="text" id="link" name="link" placeholder="Paste link here" autocomplete="off"/><button class="button" id="submit-link">Submit</button>';
  const submit_link = document.getElementById("submit-link");
  submit_link.addEventListener("click", function () {
    const link = document.getElementById("link").value;
    console.log(link);
    close.click();
  });
});
