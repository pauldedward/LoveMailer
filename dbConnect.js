const mongoose = require("mongoose");

const dbConnect = (async () => {
    try {
        await mongoose
            .connect(
                "mongodb+srv://admin-user:" + process.env.PASSWORD + "@cluster0.hyqg9.mongodb.net/" + process.env.DB_NAME + "?retryWrites=true&w=majority",
                { useNewUrlParser: true, useUnifiedTopology: true }
            )
            .then(() => console.log("db connected"));

        const db = mongoose.connection;
    } catch (err) {
        console.log("error: " + err);
    }
})();

module.exports = dbConnect;
