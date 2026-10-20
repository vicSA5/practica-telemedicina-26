// rest.get(url, callback)
// rest.post(url, body, callback)
// rest.put(url, body, callback)
// rest.delete(url, callback)
// function callback(estado, respuesta) {...}

var express = require("express");
var app = express();

var bd = require('./conexion_mysql.js');

var jwt = require("jwt-simple");
var clave = "vicsa";

app.use("/appClienteGestor", express.static("cliente_gestor")); 
app.use(express.json());

/*
Resumen códigos:
200: Éxito
201: recurso creado
301: token ausente, incorrecto o expirado
400: solicitud incorrecta --> faltan datos o formato erróneo
403: login incorrecto
404: recurso no encontrado
*/

// no necesitan token

app.post("/api/gestores/login", function(req, res){
    var user = req.body.user;
    var contra = req.body.contra;

    bd.query("SELECT id FROM gestores WHERE usuario = ? AND password = ?", [user,contra], function(err, gestor){
        if (err){
            return res.status(500).json("Error de la BD");
        }  
        
        if (gestor.length > 0){
            var contenido = {
                usuario: gestor[0].id,
                expira: Date.now() + 60 * 60 * 1000 // expira en 1 hora
            };
            var token = jwt.encode(contenido, clave);
            return res.status(200).json({id: gestor[0].id, token: token});
        }
        return res.status(403).json("Login incorrecto");
    })
});


//Crear gestor 
app.post("/api/gestores", function(req, res){
    bd.query("SELECT id FROM gestores WHERE usuario = ?", [req.params.usuario], function(err, gestor){        
        if (gestor.length > 0){
            return res.status(403).json("Usuario repetido");
        }

        var valores = [req.body.nombre, req.body.apellidos, req.body.usuario, req.body.password];
        bd.query("INSERT INTO gestores (nombre, apellidos, usuario, password) VALUES (?,?,?,?)", valores, function(err, result){
            if (err) {
                return res.status(500).json("Error al registrar el usuario");
            }

            return res.status(201).json("Usuario registrado correctamente");
        });
    });
});

// MIDDLEWARE JWT
// Todo lo que haya debajo de este use necesita token

app.use("/api", function (req, res, next) {
    var token = req.query.token;
    if (!token) {
        return res.status(301).json("No se ha encontrado token");
    }

    try {
        var contenidoToken = jwt.decode(token, clave);
    } catch (error) {
        return res.status(301).json("El token es incorrecto");
    }

    if (!contenidoToken || !contenidoToken.expira || !contenidoToken.usuario) {
        return res.status(301).json("El formato del token no es adecuado");
    }

    if (contenidoToken.expira < Date.now()) {
        return res.status(301).json("El token ha expirado");
    }

    next();
});

// necesitan token

app.get("/api/ubicaciones", function(req, res){
    bd.query("SELECT * FROM ubicaciones", function(err, ubicaciones){
        if (err) {
            res.status(500).json(err);
        } else {
            res.status(200).json(ubicaciones);
        }
    });
});

app.get("/api/categorias", function(req, res){
    bd.query("SELECT * FROM categorias", function(err, categorias){
        if (err) {
            res.status(500).json(err);
        } else {
            res.status(200).json(categorias);
        }
    });
});

app.get("/api/modelos", function(req, res){
    bd.query("SELECT * FROM modelos", function(err, modelos){
        if (err) {
            res.status(500).json(err);
        } else {
            res.status(200).json(modelos);
        }
    });
});

//Actualizar gestor
app.put("/api/gestores/:id", function(req, res){
    var id = parseInt(req.params.id);
    bd.query("SELECT * FROM gestores WHERE id = ?", [id], function(err, gestor){
        if (err) {
            return res.status(500).json("Error en la base de datos");
        }

        if (gestor.length == 0) {
            return res.status(404).json("Gestor no encontrado");
        }

        bd.query("SELECT id FROM gestores WHERE usuario = ?", [req.body.usuario], function(err, result){
            if (err) {
                return res.status(500).json("Error en la base de datos");
            }

            if (result.length > 0) {
                return res.status(403).json("Usuario repetido");
            } 

            var campos = [];
            var valores = [];

            if (req.body.nombre) {
                campos.push("nombre = ?");
                valores.push(req.body.nombre);
            }

            if (req.body.apellidos) {
                campos.push("apellidos = ?");
                valores.push(req.body.apellidos);
            }

            if (req.body.usuario) {
                campos.push("usuario = ?");
                valores.push(req.body.usuario);
            }

            if (req.body.password) {
                campos.push("password = ?");
                valores.push(req.body.password);
            }

            valores.push(id);
            // UPDATE gestores SET nombre = ?, apellidos = ?, usuario = ?, password = ? WHERE id = ?
            bd.query(
                "UPDATE gestores SET " + campos.join(", ") + " WHERE id = ?",
                valores,
                function(err, resultado) {

                    if (err) {
                        return res.status(500).json("Error en la base de datos");
                    }

                    return res.status(200).json("Gestor actualizado correctamente");
                }
            );
        });
    });
});

app.get("/api/gestores/:id", function(req, res){
    var id = parseInt(req.params.id);

    bd.query("SELECT * FROM gestores WHERE id = ?", [id], function(err, gestor){
        if (err){
            return res.status(500).json("Error BD");
        }
        
        if (gestor.length == 0){
            return res.status(404).json("Gestor no encontrado");
        }

        
        return res.status(200).json({nombre: gestor[0].nombre,
                    apellidos: gestor[0].apellidos,
                    usuario: gestor[0].usuario
        });
        
    })
});

app.get("/api/sanitarios/:id", function(req, res){
    var id = parseInt(req.params.id);

    bd.query("SELECT * FROM sanitarios WHERE id = ?", [id], function(err, sanit){
        if (err){
            return res.status(500).json("Error BD");
        }
        
        if (sanit.length == 0){
            return res.status(404).json("sanit no encontrado");
        }

        
        return res.status(200).json({nombre: sanit[0].nombre,
                    apellidos: sanit[0].apellidos,
                    usuario: sanit[0].usuario
        });
        
    })
});

//     recursos {
//     id: number;
//     modelo: number;
//     ubicacion: number;
//     numero_serie: string;
//     estado: number;

app.get("/api/recursos", function(req, res) {

    var filtros = req.query;

    var sql = `
        SELECT recursos.*
        FROM recursos
        JOIN modelos ON recursos.modelo = modelos.id
        WHERE 1=1
    `;

    var valores = [];

    if (filtros.categoria) {
        sql += " AND modelos.categoria = ?";
        valores.push(filtros.categoria);
    }

    if (filtros.modelo) {
        sql += " AND recursos.modelo = ?";
        valores.push(filtros.modelo);
    }

    if (filtros.ubicacion) {
        sql += " AND recursos.ubicacion = ?";
        valores.push(filtros.ubicacion);
    }

    if (filtros.estado) {
        sql += " AND recursos.estado = ?";
        valores.push(filtros.estado);
    }

    bd.query(sql, valores, function(err, resultado) {

        if (err) {
            return res.status(500).json("Error en la base de datos");
        }

        return res.status(200).json(resultado);
    });

});

app.get("/api/recursos/:id", function(req, res){
    var id = parseInt(req.params.id);

    bd.query("SELECT * FROM recursos WHERE id = ?", [id], function(err, recurso){
        if (err){
            return res.status(500).json("Error BD");
        }
        
        if (recurso.length == 0){
            return res.status(404).json("Recurso no encontrado");
        }

        
        return res.status(200).json({numero_serie: recurso[0].numero_serie,
                    estado: recurso[0].estado,
                    modelo: recurso[0].modelo,
                    id: recurso[0].id,
                    ubicacion: recurso[0].ubicacion
        });
        
    })
});

app.post("/api/recursos/", function(req, res){    
    var valores = [req.body.modelo, req.body.ubicacion, req.body.numero_serie, req.body.estado];
    bd.query("INSERT INTO recursos (modelo, ubicacion, numero_serie, estado) VALUES (?,?,?,?)", valores, function(err, result){
        if (err) {
            return res.status(500).json("Error al registrar el recurso");
        }

        return res.status(201).json("Recurso registrado correctamente");
    });

});

app.put("/api/recursos/:id", function(req, res){
    var id = parseInt(req.params.id);
    
    bd.query("SELECT * FROM recursos WHERE id = ?", [id], function(err, rec){
        if (err){
            res.status(500).json("error bd");
        }
        
        if (rec == 0){
            res.status(404).json("recurso no encontrado");
        }
        
        var campos = [];
        var valores = [];
        
        if (req.body.modelo) {
            campos.push("modelo = ?");
            valores.push(req.body.modelo);
        }

        if (req.body.ubicacion) {
            campos.push("ubicacion = ?");
            valores.push(req.body.ubicacion);
        }
        
        if (req.body.numero_serie) {
            campos.push("numero_serie = ?");
            valores.push(req.body.numero_serie);
        }
        
        if (req.body.estado) {
            campos.push("estado = ?");
            valores.push(req.body.estado);
        }
        
        valores.push(id);
        
        bd.query(
            "UPDATE recursos SET " + campos.join(", ") + " WHERE id = ?",
            valores,
            function(err, resultado) {

                if (err) {
                    return res.status(500).json("Error en la base de datos");
                }

                return res.status(200).json("Recurso actualizado correctamente");
            }
        );
    });
});

app.delete("/api/recursos/:id", function(req, res){
    var id = parseInt(req.params.id);

    bd.query("DELETE FROM recursos WHERE id = ?", [id], function(err, resultado){

        if (err){
            return res.status(500).json("Error en la base de datos");
        }

        if (resultado.affectedRows == 0){
            return res.status(404).json("Recurso no encontrado");
        }

        return res.status(200).json("Recurso eliminado correctamente");
    });
});

app.get("/api/recursos/:id/reservas", function(req, res){
    var id = parseInt(req.params.id);
    bd.query("SELECT * FROM reservas WHERE recurso = ?", [id], function(err, reservas){
        if (err){
            return res.status(500).json("Error en la base de datos");
        }
        res.status(200).json(reservas);
    });
});

app.get("/api/recursos/:id/resenyas", function(req, res){
    var id = parseInt(req.params.id);
    bd.query("SELECT * FROM resenyas WHERE recurso = ?", [id], function(err, resenyas){
        if (err){
            return res.status(500).json("Error en la base de datos");
        }
        res.status(200).json(resenyas);
    });
});

app.listen(3000,function(){
    console.log("Servidor sanitario iniciado correctamente en el puerto 3000")
});