function Dialog(root, options = {}) {
  this.root = root;
  this.options = options || {};

}

Dialog.prototype.render = function render() {
  Object.entries(this.options).forEach(([key, val]) => {
console.log(key, val);
  })
}

const dialog = new Dialog(document.body, {
  type: "warning",
  title: "Judul Dialog",
  meta: 'meta isi content dialog',
  actions: {
    negative: "cancel",
    positive: "confirm"
  }
})

console.log(dialog)
dialog.render()