require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const sql = require('mssql');

const app = express();
const port = 3000;

// Configuración de SQL Server
const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    options: {
        encrypt: true,
        trustServerCertificate: true
    }
};

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

app.get('/api/get-table', async (req, res) => {
    const { fecha, hora, bimodal, proveedor, ap_programacion } = req.query; // Obtener los parámetros de consulta
    try {
        const pool = await sql.connect(config);
        let query = 'SELECT fecha, hora, bimodal, proveedor, unidades, ap_programacion FROM pg_bimodal WHERE 1=1';
        const request = pool.request();

        // Agregar filtros dinámicamente
        if (fecha) {
            query += ' AND fecha = @fecha';
            request.input('fecha', sql.VarChar, fecha);
        }
        if (hora) {
            query += ' AND hora = @hora';
            request.input('hora', sql.VarChar, hora);
        }
        if (bimodal) {
            query += ' AND bimodal = @bimodal';
            request.input('bimodal', sql.VarChar, bimodal);
        }
        if (proveedor) {
            query += ' AND proveedor = @proveedor';
            request.input('proveedor', sql.VarChar, proveedor);
        }
        if (ap_programacion) {
            query += ' AND ap_programacion = @ap_programacion';
            request.input('ap_programacion', sql.VarChar, ap_programacion);
        }

        const result = await request.query(query);
        res.json(result.recordset); // Devolver los registros obtenidos como JSON
    } catch (error) {
        console.error('Error al obtener los datos:', error);
        res.status(500).json({ message: 'Error al obtener los datos' });
    }
});

app.post('/api/update-table', async (req, res) => {
    const updatedData = req.body;
    try {
        const pool = await sql.connect(config);

        for (const row of updatedData) {
            const fecha = row[0];
            const hora = row[1];
            const bimodal = row[2];
            const proveedor = row[3];
            const unidades = row[4];
            const ap_programacion = row[5];

            // Obtener el registro actual de la base de datos
            const result = await pool.request()
                .input('fecha', sql.VarChar, fecha)
                .input('hora', sql.VarChar, hora)
                .input('bimodal', sql.VarChar, bimodal)
                .input('proveedor', sql.VarChar, proveedor)
                .query('SELECT unidades, ap_programacion FROM pg_bimodal WHERE fecha = @fecha AND hora = @hora AND bimodal = @bimodal AND proveedor = @proveedor');

            const currentRow = result.recordset[0];

            // Comparar los datos actuales con los nuevos datos
            if (currentRow && (currentRow.unidades !== unidades || currentRow.ap_programacion !== ap_programacion)) {
                // Si hay cambios, actualizar el registro
                await pool.request()
                    .input('fecha', sql.VarChar, fecha)
                    .input('hora', sql.VarChar, hora)
                    .input('bimodal', sql.VarChar, bimodal)
                    .input('proveedor', sql.VarChar, proveedor)
                    .input('unidades', sql.Int, unidades)
                    .input('ap_programacion', sql.Int, ap_programacion)
                    .query('UPDATE pg_bimodal SET unidades = @unidades, ap_programacion = @ap_programacion WHERE fecha = @fecha AND hora = @hora AND bimodal = @bimodal AND proveedor = @proveedor');
            }
        }

        res.json({ message: 'Datos actualizados correctamente' });
    } catch (error) {
        console.error('Error al actualizar los datos:', error);
        res.status(500).json({ message: 'Error al actualizar los datos' });
    }
});

app.get('/api/get-filter-options', async (req, res) => {
    try {
        const pool = await sql.connect(config);

        // Obtener opciones únicas para bimodal, proveedor y ap_programacion
        const horaQuery = 'SELECT DISTINCT hora FROM pg_bimodal';
        const bimodalQuery = 'SELECT DISTINCT bimodal FROM pg_bimodal';
        const proveedorQuery = 'SELECT DISTINCT proveedor FROM pg_bimodal';
        const apQuery = 'SELECT DISTINCT ap_programacion FROM pg_bimodal';

        const horaResult = await pool.request().query(horaQuery);
        const bimodalResult = await pool.request().query(bimodalQuery);
        const proveedorResult = await pool.request().query(proveedorQuery);
        const apResult = await pool.request().query(apQuery);

        res.json({
            hora: horaResult.recordset.map(row => row.hora),
            bimodal: bimodalResult.recordset.map(row => row.bimodal),
            proveedor: proveedorResult.recordset.map(row => row.proveedor),
            ap_programacion: apResult.recordset.map(row => row.ap_programacion)
        });
    } catch (error) {
        console.error('Error al obtener las opciones de filtro:', error);
        res.status(500).json({ message: 'Error al obtener las opciones de filtro' });
    }
});




app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});