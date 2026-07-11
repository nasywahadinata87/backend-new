require("dotenv").config();

const express = require("express");
const cors = require("cors");
const db = require("./db");

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;

// =========================================================
// MIDDLEWARE
// =========================================================

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

// Menandakan apakah sudah pernah menerima data dari ESP32
let dataReceived = false;

// =========================================================
// INSERT DATA DARI ESP32
// =========================================================

app.post("/insert_data", async (req, res) => {

    try {

        const {
            mode,
            sumber,
            tegangan,
            arus,
            soc,
            pf
        } = req.body;

        // =========================================
        // UPDATE DATA REALTIME
        // =========================================

        realtimeData = {
            mode,
            sumber,
            tegangan: Number(tegangan),
            arus: Number(arus),
            soc: Number(soc),
            pf: Number(pf)
        };

        dataReceived = true;
        console.log("📡 Data Realtime :", realtimeData);

        res.send("OK");

    } catch (err) {

        console.error(err);

        res.status(500).send(err.message);

    }

});

// =========================================================
// SIMPAN DATA LOGGER SETIAP 5 MENIT
// =========================================================

const SAVE_INTERVAL = 5 * 60 * 1000;

setInterval(async () => {

    // Belum ada data dari ESP32
    if (!dataReceived) {
        return;
    }

    try {

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
            realtimeData.mode,
            realtimeData.sumber,
            realtimeData.tegangan,
            realtimeData.arus,
            realtimeData.soc,
            realtimeData.pf
        ]);

        console.log("✅ Data Logger tersimpan ke database");

    } catch (err) {

        console.error("❌ Gagal menyimpan data logger:", err.message);

    }

}, SAVE_INTERVAL);

// =========================================================
// DATA REALTIME
// =========================================================

app.get("/realtime", (req, res) => {

    res.json(realtimeData);

});

// =========================================================
// RIWAYAT LOG
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
// TEST BACKEND
// =========================================================

app.get("/", (req, res) => {

    res.send("Backend ATS Running");

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

            csv +=
                `${row.waktu},` +
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

app.listen(PORT, () => {

    console.log(`Server berjalan di port ${PORT}`);

});