require("dotenv").config();

const express = require("express");
const cors = require("cors");
const db = require("./db");

const app = express();

const PORT = process.env.PORT || 3000;

// =========================================================
// MIDDLEWARE
// =========================================================

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// =========================================================
// DATA REALTIME (RAM)
// =========================================================

let realtimeData = {
    mode: "NETRAL",
    sumber: "MATI",
    tegangan: 0,
    arus: 0,
    soc: 0,
    pf: 0
};

// =========================================================
// POST DATA REALTIME DARI ESP32 (1 DETIK)
// =========================================================

app.post("/realtime", (req, res) => {

    try {

        const {
            mode,
            sumber,
            tegangan,
            arus,
            soc,
            pf
        } = req.body;

        realtimeData = {
            mode,
            sumber,
            tegangan: Number(tegangan),
            arus: Number(arus),
            soc: Number(soc),
            pf: Number(pf)
        };

        console.log("📡 Data Realtime :", realtimeData);

        res.send("OK");

    } catch (err) {

        console.error(err);

        res.status(500).send(err.message);

    }

});

// =========================================================
// POST DATA LOGGER DARI ESP32 (5 MENIT)
// =========================================================

app.post("/logger", async (req, res) => {

    try {

        const {
            mode,
            sumber,
            tegangan,
            arus,
            soc,
            pf
        } = req.body;

        const sql = `
            INSERT INTO log_sensor
            (
                mode_sistem,
                sumber_aktif,
                tegangan,
                arus,
                soc,
                pf
            )
            VALUES (?, ?, ?, ?, ?, ?)
        `;

        await db.execute(sql, [
            mode,
            sumber,
            Number(tegangan),
            Number(arus),
            Number(soc),
            Number(pf)
        ]);

        console.log("✅ Data Logger tersimpan");

        res.send("OK");

    } catch (err) {

        console.error(err);

        res.status(500).send(err.message);

    }

});

// =========================================================
// GET DATA REALTIME
// =========================================================

app.get("/realtime", (req, res) => {

    res.json(realtimeData);

});

// =========================================================
// GET DATA LOGGER
// =========================================================

app.get("/logs", async (req, res) => {

    try {

        const [rows] = await db.execute(`
            SELECT *
            FROM log_sensor
            ORDER BY waktu DESC
            LIMIT 20
        `);

        res.json(rows);

    } catch (err) {

        console.error(err);

        res.status(500).json({
            error: err.message
        });

    }

});

// =========================================================
// EXPORT CSV
// =========================================================

app.get("/export_csv", async (req, res) => {

    try {

        const [rows] = await db.query(`
            SELECT
                waktu,
                mode_sistem,
                sumber_aktif,
                tegangan,
                arus,
                soc,
                pf
            FROM log_sensor
            ORDER BY waktu DESC
        `);

        let csv =
            "Waktu,Mode Sistem,Sumber Aktif,Tegangan (V),Arus (A),SoC (%),Power Factor\n";

        rows.forEach(row => {

            const waktuWIB = new Date(row.waktu).toLocaleString("id-ID", {
                timeZone: "Asia/Jakarta",
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: false
            });

            csv +=
                `${waktuWIB},` +
                `${row.mode_sistem},` +
                `${row.sumber_aktif},` +
                `${row.tegangan},` +
                `${row.arus},` +
                `${row.soc},` +
                `${row.pf}\n`;

        });

        res.setHeader(
            "Content-Disposition",
            "attachment; filename=Log_Sensor_ATS.csv"
        );

        res.setHeader("Content-Type", "text/csv");

        res.send(csv);

    } catch (err) {

        console.error(err);

        res.status(500).send("Gagal export CSV");

    }

});

// =========================================================
// TEST BACKEND
// =========================================================

app.get("/", (req, res) => {

    res.send("Backend ATS Running");

});

// =========================================================

app.listen(PORT, () => {

    console.log(`Server berjalan di port ${PORT}`);

});