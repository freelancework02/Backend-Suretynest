

// // controllers/eventsController.js
// const pool = require("../Db/index");

// // -------------------- HELPERS --------------------
// const parseBool = (v) => ["true", "1", 1, true, "on"].includes(v);

// const ensureNumber = (v) => {
//     const n = Number(v);
//     return Number.isFinite(n) ? n : null;
// };

// // Convert incoming ISO date → MySQL UTC DATETIME
// // function toMysqlUTC(value) {
// //     if (!value) return null;
// //     const d = new Date(value); // expects ISO (UTC)
// //     if (isNaN(d)) return null;
// //     return d.toISOString().slice(0, 19).replace("T", " ");
// // }

// // CORS helper for image blobs
// const setCORS = (req, res) => {
//     const origin = req.headers.origin;
//     if (origin) {
//         res.setHeader("Access-Control-Allow-Origin", origin);
//         res.setHeader("Access-Control-Allow-Credentials", "true");
//     }
// };

// // -------------------- CREATE EVENT --------------------
// exports.createEvent = async (req, res) => {
//     const conn = await pool.getConnection();
//     try {
//         await conn.beginTransaction();

//         const {
//             title,
//             event_date,
//             hosted_by,
//             link,
//             address,
//             description,
//             status = "1",
//             coverIndex = "0",
//         } = req.body;

//         let files = [];
//         if (req.files) {
//             files = Array.isArray(req.files)
//                 ? req.files
//                 : req.files["images"] || req.files["images[]"] || [];
//         }

//         if (!title || !files.length) {
//             await conn.rollback();
//             return res.status(400).json({ error: "Title and images required" });
//         }

//         const eventDateUTC = event_date || null;

//         const [result] = await conn.query(
//             `INSERT INTO events
//        (title, event_date, hosted_by, link, address, description, status)
//        VALUES (?, ?, ?, ?, ?, ?, ?)`,
//             [
//                 title.trim(),
//                 eventDateUTC,
//                 hosted_by || null,
//                 link || null,
//                 address || null,
//                 description || null,
//                 parseBool(status) ? 1 : 0,
//             ]
//         );

//         const eventId = result.insertId;
//         const imageIds = [];

//         let order = 0;
//         for (const file of files) {
//             const [img] = await conn.query(
//                 `INSERT INTO event_images
//          (event_id, image_name, image_blob, sort_order)
//          VALUES (?, ?, ?, ?)`,
//                 [eventId, file.originalname || "image", file.buffer, order]
//             );
//             imageIds.push(img.insertId);
//             order++;
//         }

//         const ci = Math.min(imageIds.length - 1, Math.max(0, Number(coverIndex)));
//         await conn.query(
//             `UPDATE events SET cover_image_id = ? WHERE id = ?`,
//             [imageIds[ci], eventId]
//         );

//         await conn.commit();
//         res.status(201).json({ ok: true, eventId });
//     } catch (err) {
//         await conn.rollback();
//         console.error("createEvent error:", err);
//         res.status(500).json({ error: err.message });
//     } finally {
//         conn.release();
//     }
// };

// // -------------------- UPDATE EVENT --------------------
// exports.updateEvent = async (req, res) => {
//     const id = Number(req.params.id);
//     if (!Number.isInteger(id)) {
//         return res.status(400).json({ error: "Invalid ID" });
//     }

//     const {
//         title,
//         event_date,
//         hosted_by,
//         link,
//         address,
//         description,
//         status,
//         deleteImageIds,
//         coverIndex,
//     } = req.body;

//     let files = [];
//     if (req.files) {
//         files = req.files["images"] || req.files["images[]"] || [];
//     }

//     const conn = await pool.getConnection();
//     try {
//         await conn.beginTransaction();

//         const fields = [];
//         const params = [];

//         if (title !== undefined) {
//             fields.push("title = ?");
//             params.push(title.trim());
//         }

//         if (event_date !== undefined) {
//             fields.push("event_date = ?");
//             params.push(event_date || null); // ✅

//         }

//         if (hosted_by !== undefined) {
//             fields.push("hosted_by = ?");
//             params.push(hosted_by || null);
//         }

//         if (link !== undefined) {
//             fields.push("link = ?");
//             params.push(link || null);
//         }

//         if (address !== undefined) {
//             fields.push("address = ?");
//             params.push(address || null);
//         }

//         if (description !== undefined) {
//             fields.push("description = ?");
//             params.push(description || null);
//         }

//         if (status !== undefined) {
//             fields.push("status = ?");
//             params.push(parseBool(status) ? 1 : 0);
//         }

//         if (fields.length) {
//             params.push(id);
//             await conn.query(
//                 `UPDATE events SET ${fields.join(", ")} WHERE id = ?`,
//                 params
//             );
//         }

//         // Delete images
//         if (deleteImageIds) {
//             const ids = String(deleteImageIds)
//                 .split(",")
//                 .map(Number)
//                 .filter(Boolean);

//             if (ids.length) {
//                 await conn.query(
//                     `UPDATE events SET cover_image_id = NULL WHERE cover_image_id IN (?)`,
//                     [ids]
//                 );
//                 await conn.query(
//                     `DELETE FROM event_images WHERE id IN (?) AND event_id = ?`,
//                     [ids, id]
//                 );
//             }
//         }

//         // Add new images
//         if (files.length) {
//             const [[{ maxorder }]] = await conn.query(
//                 `SELECT COALESCE(MAX(sort_order), -1) AS maxorder
//          FROM event_images WHERE event_id = ?`,
//                 [id]
//             );

//             let order = maxorder;
//             for (const f of files) {
//                 order++;
//                 await conn.query(
//                     `INSERT INTO event_images
//            (event_id, image_name, image_blob, sort_order)
//            VALUES (?, ?, ?, ?)`,
//                     [id, f.originalname, f.buffer, order]
//                 );
//             }
//         }

//         // Update cover image
//         if (coverIndex !== undefined) {
//             const idx = Math.max(0, Number(coverIndex));
//             const [imgs] = await conn.query(
//                 `SELECT id FROM event_images
//          WHERE event_id = ?
//          ORDER BY sort_order ASC LIMIT 1 OFFSET ?`,
//                 [id, idx]
//             );

//             if (imgs.length) {
//                 await conn.query(
//                     `UPDATE events SET cover_image_id = ? WHERE id = ?`,
//                     [imgs[0].id, id]
//                 );
//             }
//         }

//         await conn.commit();
//         res.json({ ok: true });
//     } catch (err) {
//         await conn.rollback();
//         console.error("updateEvent error:", err);
//         res.status(500).json({ error: err.message });
//     } finally {
//         conn.release();
//     }
// };

// // -------------------- LIST EVENTS (ACTIVE) --------------------
// exports.listEvents = async (req, res) => {
//     const page = Math.max(1, Number(req.query.page) || 1);
//     const per = Math.min(100, Number(req.query.per) || 12);
//     const offset = (page - 1) * per;

//     const conn = await pool.getConnection();
//     try {
//         const [rows] = await conn.query(
//             `SELECT e.*,
//        (SELECT COUNT(*) FROM event_images WHERE event_id = e.id) AS images_count
//        FROM events e
//        WHERE status = 1
//        ORDER BY event_date DESC
//        LIMIT ? OFFSET ?`,
//             [per, offset]
//         );

//         res.json({ page, per, data: rows });
//     } catch (err) {
//         res.status(500).json({ error: err.message });
//     } finally {
//         conn.release();
//     }
// };

// // -------------------- GET SINGLE EVENT --------------------
// exports.getEvent = async (req, res) => {
//     const id = Number(req.params.id);
//     if (!Number.isInteger(id)) {
//         return res.status(400).json({ error: "Invalid ID" });
//     }

//     const conn = await pool.getConnection();
//     try {
//         const [[event]] = await conn.query(
//             `SELECT * FROM events WHERE id = ?`,
//             [id]
//         );
//         if (!event) return res.status(404).json({ error: "Not found" });

//         const [images] = await conn.query(
//             `SELECT id, image_name, sort_order, created_at
//        FROM event_images
//        WHERE event_id = ?
//        ORDER BY sort_order, id`,
//             [id]
//         );

//         res.json({ event, images });
//     } catch (err) {
//         res.status(500).json({ error: err.message });
//     } finally {
//         conn.release();
//     }
// };

// // -------------------- IMAGE BLOB --------------------
// exports.getImageBlob = async (req, res) => {
//     const id = Number(req.params.imageId);
//     if (!Number.isInteger(id)) {
//         return res.status(400).json({ error: "Invalid ID" });
//     }

//     const conn = await pool.getConnection();
//     try {
//         const [[img]] = await conn.query(
//             `SELECT image_name, image_blob FROM event_images WHERE id = ?`,
//             [id]
//         );
//         if (!img) return res.status(404).json({ error: "Not found" });

//         setCORS(req, res);
//         res.setHeader("Content-Disposition", `inline; filename="${img.image_name}"`);
//         res.send(img.image_blob);
//     } catch (err) {
//         res.status(500).json({ error: err.message });
//     } finally {
//         conn.release();
//     }
// };

// // -------------------- DELETE EVENT --------------------
// exports.deleteEvent = async (req, res) => {
//     const id = Number(req.params.id);
//     if (!Number.isInteger(id)) {
//         return res.status(400).json({ error: "Invalid ID" });
//     }

//     try {
//         const [r] = await pool.query(`DELETE FROM events WHERE id = ?`, [id]);
//         if (!r.affectedRows) {
//             return res.status(404).json({ error: "Not found" });
//         }
//         res.json({ ok: true });
//     } catch (err) {
//         res.status(500).json({ error: err.message });
//     }
// };

// // -------------------- DELETE IMAGE --------------------
// exports.deleteImage = async (req, res) => {
//     const id = Number(req.params.imageId);
//     if (!Number.isInteger(id)) {
//         return res.status(400).json({ error: "Invalid ID" });
//     }

//     const conn = await pool.getConnection();
//     try {
//         await conn.beginTransaction();
//         await conn.query(
//             `UPDATE events SET cover_image_id = NULL WHERE cover_image_id = ?`,
//             [id]
//         );
//         const [r] = await conn.query(
//             `DELETE FROM event_images WHERE id = ?`,
//             [id]
//         );
//         await conn.commit();

//         if (!r.affectedRows) {
//             return res.status(404).json({ error: "Not found" });
//         }
//         res.json({ ok: true });
//     } catch (err) {
//         await conn.rollback();
//         res.status(500).json({ error: err.message });
//     } finally {
//         conn.release();
//     }
// };



// // -------------------- LIST ALL EVENTS --------------------
// exports.listAllEvents = async (req, res) => {
//     try {
//         const [rows] = await pool.query(
//             `SELECT e.*,
//              (SELECT COUNT(*) FROM event_images WHERE event_id = e.id) AS images_count
//              FROM events e
//              ORDER BY event_date DESC`
//         );
//         res.json({ data: rows });
//     } catch (err) {
//         res.status(500).json({ error: err.message });
//     }
// };

// // -------------------- LIST PREVIOUS EVENTS --------------------
// exports.listPreviousEvents = async (req, res) => {
//     try {
//         const [rows] = await pool.query(
//             `SELECT e.*,
//              (SELECT COUNT(*) FROM event_images WHERE event_id = e.id) AS images_count
//              FROM events e
//              WHERE status = 0
//              ORDER BY event_date DESC`
//         );
//         res.json({ data: rows });
//     } catch (err) {
//         res.status(500).json({ error: err.message });
//     }
// };

// // -------------------- CREATE SINGLE IMAGE --------------------
// exports.createImage = async (req, res) => {
//     if (!req.file || !req.body.event_id) {
//         return res.status(400).json({ error: "Image and event_id required" });
//     }

//     try {
//         const [r] = await pool.query(
//             `INSERT INTO event_images (event_id, image_name, image_blob, sort_order)
//              VALUES (?, ?, ?, 0)`,
//             [req.body.event_id, req.file.originalname, req.file.buffer]
//         );
//         res.status(201).json({ ok: true, id: r.insertId });
//     } catch (err) {
//         res.status(500).json({ error: err.message });
//     }
// };

// // -------------------- ARCHIVE EVENT --------------------
// exports.archiveEvent = async (req, res) => {
//     const id = Number(req.params.id);
//     if (!Number.isInteger(id)) {
//         return res.status(400).json({ error: "Invalid ID" });
//     }

//     try {
//         const [r] = await pool.query(
//             `UPDATE events SET status = 0 WHERE id = ?`,
//             [id]
//         );
//         if (!r.affectedRows) {
//             return res.status(404).json({ error: "Not found" });
//         }
//         res.json({ ok: true });
//     } catch (err) {
//         res.status(500).json({ error: err.message });
//     }
// };




const pool = require("../Db/index");

// -------------------- HELPERS --------------------
const parseBool = (v) => ["true", "1", 1, true, "on"].includes(v);

// CORS helper for image blobs
const setCORS = (req, res) => {
    const origin = req.headers.origin;
    if (origin) {
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Access-Control-Allow-Credentials", "true");
    }
};

// -------------------- CREATE EVENT --------------------
exports.createEvent = async (req, res) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const {
            title,
            event_datetime,     // STRING (stored as-is)
            event_timezone,
            hosted_by,
            link,
            address,
            description,
            status = "1",
            coverIndex = "0",
        } = req.body;

        if (!title || !event_datetime || !event_timezone) {
            await conn.rollback();
            return res.status(400).json({
                error: "title, event_datetime, and event_timezone are required",
            });
        }

        let files = [];
        if (req.files) {
            files = req.files["images"] || req.files["images[]"] || [];
        }

        if (!files.length) {
            await conn.rollback();
            return res.status(400).json({ error: "Images required" });
        }

        // ✅ STORE DATE AS STRING — NO CONVERSION
        const eventDateString = event_datetime;

        const [result] = await conn.query(
            `INSERT INTO events
             (title, event_date, event_timezone, hosted_by, link, address, description, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                title.trim(),
                eventDateString,
                event_timezone.trim(),
                hosted_by || null,
                link || null,
                address || null,
                description || null,
                parseBool(status) ? 1 : 0,
            ]
        );

        const eventId = result.insertId;

        let order = 0;
        const imageIds = [];
        for (const file of files) {
            const [img] = await conn.query(
                `INSERT INTO event_images
                 (event_id, image_name, image_blob, sort_order)
                 VALUES (?, ?, ?, ?)`,
                [eventId, file.originalname || "image", file.buffer, order++]
            );
            imageIds.push(img.insertId);
        }

        const ci = Math.min(imageIds.length - 1, Math.max(0, Number(coverIndex)));
        await conn.query(
            `UPDATE events SET cover_image_id = ? WHERE id = ?`,
            [imageIds[ci], eventId]
        );

        await conn.commit();
        res.status(201).json({ ok: true, eventId });
    } catch (err) {
        await conn.rollback();
        console.error("createEvent error:", err);
        res.status(500).json({ error: err.message });
    } finally {
        conn.release();
    }
};

// -------------------- UPDATE EVENT --------------------
exports.updateEvent = async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
        return res.status(400).json({ error: "Invalid ID" });
    }

    const {
        title,
        event_datetime,
        event_timezone,
        hosted_by,
        link,
        address,
        description,
        status,
        deleteImageIds,
        coverIndex,
    } = req.body;

    let files = [];
    if (req.files) {
        files = req.files["images"] || req.files["images[]"] || [];
    }

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const fields = [];
        const params = [];

        if (title !== undefined) {
            fields.push("title = ?");
            params.push(title.trim());
        }

        // ✅ STORE STRING AS-IS
        if (event_datetime !== undefined) {
            fields.push("event_date = ?");
            params.push(event_datetime);
        }

        if (event_timezone !== undefined) {
            fields.push("event_timezone = ?");
            params.push(event_timezone.trim());
        }

        if (hosted_by !== undefined) {
            fields.push("hosted_by = ?");
            params.push(hosted_by || null);
        }

        if (link !== undefined) {
            fields.push("link = ?");
            params.push(link || null);
        }

        if (address !== undefined) {
            fields.push("address = ?");
            params.push(address || null);
        }

        if (description !== undefined) {
            fields.push("description = ?");
            params.push(description || null);
        }

        if (status !== undefined) {
            fields.push("status = ?");
            params.push(parseBool(status) ? 1 : 0);
        }

        if (fields.length) {
            params.push(id);
            await conn.query(
                `UPDATE events SET ${fields.join(", ")} WHERE id = ?`,
                params
            );
        }

        // Delete images
        if (deleteImageIds) {
            const ids = deleteImageIds
                .split(",")
                .map(Number)
                .filter(Boolean);

            if (ids.length) {
                await conn.query(
                    `UPDATE events SET cover_image_id = NULL WHERE cover_image_id IN (?)`,
                    [ids]
                );
                await conn.query(
                    `DELETE FROM event_images WHERE id IN (?) AND event_id = ?`,
                    [ids, id]
                );
            }
        }

        // Add new images
        if (files.length) {
            const [[{ maxorder }]] = await conn.query(
                `SELECT COALESCE(MAX(sort_order), -1) AS maxorder
                 FROM event_images WHERE event_id = ?`,
                [id]
            );

            let order = maxorder;
            for (const f of files) {
                order++;
                await conn.query(
                    `INSERT INTO event_images
                     (event_id, image_name, image_blob, sort_order)
                     VALUES (?, ?, ?, ?)`,
                    [id, f.originalname, f.buffer, order]
                );
            }
        }

        // Update cover image
        if (coverIndex !== undefined) {
            const idx = Math.max(0, Number(coverIndex));
            const [imgs] = await conn.query(
                `SELECT id FROM event_images
                 WHERE event_id = ?
                 ORDER BY sort_order ASC
                 LIMIT 1 OFFSET ?`,
                [id, idx]
            );

            if (imgs.length) {
                await conn.query(
                    `UPDATE events SET cover_image_id = ? WHERE id = ?`,
                    [imgs[0].id, id]
                );
            }
        }

        await conn.commit();
        res.json({ ok: true });
    } catch (err) {
        await conn.rollback();
        console.error("updateEvent error:", err);
        res.status(500).json({ error: err.message });
    } finally {
        conn.release();
    }
};

// -------------------- LIST EVENTS (ACTIVE) --------------------
exports.listEvents = async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const per = Math.min(100, Number(req.query.per) || 12);
    const offset = (page - 1) * per;

    try {
        const [rows] = await pool.query(
            `SELECT e.*,
             (SELECT COUNT(*) FROM event_images WHERE event_id = e.id) AS images_count
             FROM events e
             WHERE status = 1
             ORDER BY event_date DESC
             LIMIT ? OFFSET ?`,
            [per, offset]
        );

        // ✅ NO DATE PARSING
        const formattedRows = rows.map(row => ({
            ...row,
            display_date: row.event_date,
            display_datetime: `${row.event_date} ${row.event_timezone}`
        }));

        res.json({ page, per, data: formattedRows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// -------------------- GET SINGLE EVENT --------------------
exports.getEvent = async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
        return res.status(400).json({ error: "Invalid ID" });
    }

    try {
        const [[event]] = await pool.query(
            `SELECT * FROM events WHERE id = ?`,
            [id]
        );
        if (!event) return res.status(404).json({ error: "Not found" });

        const [images] = await pool.query(
            `SELECT id, image_name, sort_order, created_at
             FROM event_images
             WHERE event_id = ?
             ORDER BY sort_order, id`,
            [id]
        );

        res.json({ event, images });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// -------------------- IMAGE BLOB --------------------
exports.getImageBlob = async (req, res) => {
    const id = Number(req.params.imageId);
    if (!Number.isInteger(id)) {
        return res.status(400).json({ error: "Invalid ID" });
    }

    try {
        const [[img]] = await pool.query(
            `SELECT image_name, image_blob FROM event_images WHERE id = ?`,
            [id]
        );
        if (!img) return res.status(404).json({ error: "Not found" });

        setCORS(req, res);
        res.setHeader("Content-Disposition", `inline; filename="${img.image_name}"`);
        res.send(img.image_blob);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// -------------------- DELETE EVENT --------------------
exports.deleteEvent = async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
        return res.status(400).json({ error: "Invalid ID" });
    }

    try {
        const [r] = await pool.query(`DELETE FROM events WHERE id = ?`, [id]);
        if (!r.affectedRows) return res.status(404).json({ error: "Not found" });
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// -------------------- LIST ALL EVENTS --------------------
exports.listAllEvents = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT e.*,
             (SELECT COUNT(*) FROM event_images WHERE event_id = e.id) AS images_count
             FROM events e
             ORDER BY event_date DESC`
        );

        const formattedRows = rows.map(row => ({
            ...row,
            display_date: row.event_date,
            display_datetime: `${row.event_date} ${row.event_timezone}`
        }));

        res.json({ data: formattedRows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// -------------------- LIST PREVIOUS EVENTS --------------------
exports.listPreviousEvents = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT e.*,
             (SELECT COUNT(*) FROM event_images WHERE event_id = e.id) AS images_count
             FROM events e
             WHERE status = 0
             ORDER BY event_date DESC`
        );

        const formattedRows = rows.map(row => ({
            ...row,
            display_date: row.event_date,
            display_datetime: `${row.event_date} ${row.event_timezone}`
        }));

        res.json({ data: formattedRows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// -------------------- CREATE SINGLE IMAGE --------------------
exports.createImage = async (req, res) => {
    if (!req.file || !req.body.event_id) {
        return res.status(400).json({ error: "Image and event_id required" });
    }

    try {
        const [r] = await pool.query(
            `INSERT INTO event_images (event_id, image_name, image_blob, sort_order)
             VALUES (?, ?, ?, 0)`,
            [req.body.event_id, req.file.originalname, req.file.buffer]
        );
        res.status(201).json({ ok: true, id: r.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// -------------------- ARCHIVE EVENT --------------------
exports.archiveEvent = async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
        return res.status(400).json({ error: "Invalid ID" });
    }

    try {
        const [r] = await pool.query(
            `UPDATE events SET status = 0 WHERE id = ?`,
            [id]
        );
        if (!r.affectedRows) return res.status(404).json({ error: "Not found" });
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// -------------------- DELETE IMAGE --------------------
exports.deleteImage = async (req, res) => {
    const id = Number(req.params.imageId);
    if (!Number.isInteger(id)) {
        return res.status(400).json({ error: "Invalid ID" });
    }

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        await conn.query(
            `UPDATE events SET cover_image_id = NULL WHERE cover_image_id = ?`,
            [id]
        );
        const [r] = await conn.query(
            `DELETE FROM event_images WHERE id = ?`,
            [id]
        );
        await conn.commit();

        if (!r.affectedRows) return res.status(404).json({ error: "Not found" });
        res.json({ ok: true });
    } catch (err) {
        await conn.rollback();
        res.status(500).json({ error: err.message });
    } finally {
        conn.release();
    }
};
