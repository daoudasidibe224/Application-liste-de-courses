const mongoose = require("mongoose");

const ListeSchema = new mongoose.Schema({
  titre: {
    type: String,
    required: true,
    minlength: 1,
    maxlength: 200,
    trim: true,
  },
  // avec authentification
  _idUtilisateur: {
    type: mongoose.Types.ObjectId,
    required: true,
  },
});

const Liste = mongoose.model("Liste", ListeSchema);

module.exports = {
  Liste,
};
