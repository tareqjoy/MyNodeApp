import express from 'express'

export const router = express.Router();

router.get('/', (req, res, next) => {
    res.status(200).json({
        message: "Handling GET request to /fanout"
    });
});

router.post('/', (req, res, next) => {
    res.status(200).json({
        message: "Handling POST request to /fanout"
    });
});