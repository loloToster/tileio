import express from "express"

const router = express.Router()

router.get("/", (req, res) => {
    res.render("dynamic-cells/weather")
})

export = router
