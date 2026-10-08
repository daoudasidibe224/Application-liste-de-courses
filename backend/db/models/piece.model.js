const mongoose = require('mongoose');

const PieceSchema = new mongoose.Schema({
    titre: {
        type: String,
        required: true,
        minlength: 1,
    maxlength: 200,
        trim: true
    },
    _listeId: {
        type: mongoose.Types.ObjectId,
        required: true
    },
    achetee: {
        type: Boolean,
        default: false
    }
})

const Piece = mongoose.model('Piece', PieceSchema);

module.exports = {
    Piece
}