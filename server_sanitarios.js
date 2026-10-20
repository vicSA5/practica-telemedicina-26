//Es necesario instalar en la carpeta del servidor los modulos cors y express

var rpc = require("./rpc.js"); //incorporamos la libreria
var bd = require("./conexion_mysql.js");

//Función para obtener los pacientes
// function obtenerPacientes(callback) {
//     return callback(pacientes);
// }
// function anyadirPaciente(nom, ape, ed, callback) { 
//     if (!nom || !ape || !ed) return callback(0); 

//     var id = siguienteId; 
//     siguienteId++; 
//     console.log("Añadir paciente", nom, ape, ed);
//     pacientes.push({ id: id, nombre: nom, apellidos: ape, edad: ed }); 
//     return callback(id);
// }

function obtenerCategorias(callback){
    bd.query("SELECT * FROM categorias", function(err, categorias){
        if (err){
            return callback(null);
        }
        return callback(categorias);
    })
}

function obtenerModelos(callback){
    bd.query("SELECT * FROM modelos", function(err, modelos){
        if (err){
            return callback(null);
        }
        return callback(modelos);
    });
}

function obtenerUbicaciones(callback){
    bd.query("SELECT * FROM ubicaciones", function(err, ubicaciones){
        if (err){
            return callback(null);
        }
        return callback(ubicaciones);
    });
}

function loginSanitario(usuario, password, callback){
    bd.query("SELECT id FROM sanitarios WHERE usuario = ? AND password = ?", [usuario, password], function(err, sanitId){
        if (err || sanitId.length < 1){
            return callback(null);
        }
        return callback(sanitId[0].id);
    })
}

function crearSanitario(datosSanitario, callback){
    if (!datosSanitario.nombre || !datosSanitario.apellidos || !datosSanitario.usuario || !datosSanitario.password){
        return callback(null);
    }

    bd.query("SELECT id FROM sanitarios WHERE usuario = ?", [datosSanitario.usuario], function(err, id){
        if(err || id.length > 0){
            return callback(null);
        }

        var valores = [datosSanitario.nombre, datosSanitario.apellidos, datosSanitario.usuario, datosSanitario.password];

        bd.query("INSERT INTO sanitarios (nombre, apellidos, usuario, password) VALUES (?,?,?,?)", valores , function(err, result){
            return callback(result.insertId);
        })
    })
}

function actualizarSanitario(idSanitario, datosSanitario, callback){
    bd.query("SELECT * FROM sanitarios WHERE id = ?", [idSanitario], function(err, sanitario){
        if (err) {
            return callback(null);
        }

        if (sanitario.length == 0) {
            return callback(null);
        }

        bd.query("SELECT * FROM sanitarios WHERE usuario = ? AND id != ?", [datosSanitario.usuario, idSanitario], function(err, result){
            if (err) {
                return callback(null);
            }
            
            if (result.length > 0) {
                return callback(null);
            } 

            var campos = [];
            var valores = [];

            if (datosSanitario.nombre) {
                campos.push("nombre = ?");
                valores.push(datosSanitario.nombre);
            }

            if (datosSanitario.apellidos) {
                campos.push("apellidos = ?");
                valores.push(datosSanitario.apellidos);
            }

            if (datosSanitario.usuario) {
                campos.push("usuario = ?");
                valores.push(datosSanitario.usuario);
            }

            if (datosSanitario.password) {
                campos.push("password = ?");
                valores.push(datosSanitario.password);
            }

            valores.push(idSanitario);
            // UPDATE gestores SET nombre = ?, apellidos = ?, usuario = ?, password = ? WHERE id = ?
            bd.query(
                "UPDATE sanitarios SET " + campos.join(", ") + " WHERE id = ?",
                valores,
                function(err, resultado) {
                    if (err) {
                        return callback(null);
                    }

                    return callback(idSanitario);
                }
            );
        });
    });
}

function obtenerSanitario(idSanitario, callback){
    bd.query("SELECT * FROM sanitarios WHERE id = ?", [idSanitario], function(err, sanit){
        if (err || sanit.length == 0){
            return callback(null);
        }
    
        var devolver = {
            "id": sanit[0].id,
            "nombre": sanit[0].nombre,
            "apellidos": sanit[0].apellidos,
            "usuario": sanit[0].usuario
        }
    
        return callback(devolver);
    })
}

function obtenerRecursos(idModelo, callback){
    bd.query("SELECT * FROM recursos WHERE modelo = ? AND estado = 0", [idModelo], function(err, recursos){
        if (err || recursos.length < 1){
            return callback(null);
        }
        return callback(recursos)
    })
}

function tiempoPendiente(idRecurso, callback){
    bd.query("SELECT * FROM reservas WHERE recurso = ? AND fecha_fin IS NULL", [idRecurso], function(err, reservasId){    
        if (err){
            return callback(null);
        }    
        var tiempo = 0;
        for (var i=0; i<reservasId.length; i++){
            tiempo += reservasId[i].horas_estimadas;
        }
        return callback(tiempo);
    })
}

function obtenerReservas(idSanitario, callback){
    bd.query("SELECT * FROM reservas WHERE sanitario = ?", [idSanitario], function(err, reservas){
        if (err){
            return callback(null);
        }
        return callback(reservas);
    })
}

function obtenerResenyas(idRecurso, callback){
    bd.query("SELECT * FROM resenyas WHERE recurso = ?", [idRecurso], function(err, resenyas){
        if (err){
            return callback(null);
        }
        return callback(resenyas);
    })
}

function crearResenya(idRecurso, idSanitario, valoracion, descripcion, callback){
    if (!idRecurso || !idSanitario || !valoracion){
        return callback(null);
    }

    var valores = [idRecurso, idSanitario, new Date(), valoracion, descripcion];

    bd.query("INSERT INTO resenyas (recurso, sanitario, fecha, valor, descripcion) VALUES (?,?,?,?,?)", valores , function(err, result){
        if (err){
            return callback(null);
        }
        return callback(result.insertId);
    })
    
}

function reservarRecurso(idRecurso, idSanitario, horasEstimadas, callback){
    if (!idRecurso || !idSanitario || !horasEstimadas){
        return callback(null);
    }

    var valores = [idRecurso, idSanitario, horasEstimadas, new Date(), null, null];

    bd.query("INSERT INTO reservas (recurso, sanitario, horas_estimadas, fecha_peticion, fecha_inicio, fecha_fin) VALUES (?,?,?,?,?,?)", valores , function(err, result){
        if (err){
            return callback(null);
        }
        return callback(result.insertId);
    })
}

function cancelarReserva(idReserva, callback){
    bd.query(
        "DELETE FROM reservas WHERE id = ?",
        [idReserva],
        function(err, result){
            if (err){
                return callback(false);
            }
            if (result.affectedRows == 0){
                return callback(false);
            }
            return callback(true);
        }
    );
}

function iniciarReserva(idReserva, callback) {
    bd.query("UPDATE reservas SET fecha_inicio = ? WHERE id = ?", [new Date(), idReserva], function(err, result){
        if (err){
            return callback(false);
        }

        if (result.affectedRows == 0){
            return callback(false);
        }

        return callback(true);
    })
}

function finalizarReserva(idReserva, callback){
    bd.query("UPDATE reservas SET fecha_fin = ? WHERE id = ?", [new Date(), idReserva], function(err, result){
        if (err){
            return callback(false);
        }

        if (result.affectedRows == 0){
            return callback(false);
        }

        return callback(true);
    })
}

function obtenerRecurso(idRecurso, callback){
    bd.query("SELECT * FROM recursos WHERE id = ?", [idRecurso], function(err, recu){
        if (err || recu.length == 0){
            return callback(null);
        }
        return callback(recu[0]);
    })
}

function lecturaNFC(idRecurso, idSanit, callback){
    var idRec = parseInt(idRecurso, 10);
    if (Number.isInteger(idRec)){
        bd.query("SELECT * FROM reservas WHERE recurso = ? AND sanitario = ? AND fecha_fin IS NULL", [idRec, idSanit], function(err, reservas){
            if (err){
                return callback(null);
            }

            if (reservas.length == 0){
                reservarRecurso(idRecurso, idSanit, 5, function(cb){
                    if (cb == null){
                        return callback(null);
                    } else {
                        return callback("Reserva creada correctamente.");
                    }
                })
            } else {
                if (reservas[0].fecha_inicio == null){
                    iniciarReserva(reservas[0].id, function(cb){
                    if (cb){
                        return callback("Recurso retirado correctamente.");
                    } else {
                        return callback(null);
                    }
                    });
                }
                if (reservas[0].fecha_inicio != null && reservas[0].fecha_fin == null){
                    finalizarReserva(reservas[0].id, function(cb){
                        if (cb){
                            return callback("Recurso devuelto correctamente.");
                        } else {
                            return callback(null);
                        }
                    });
                }
            }
            
        });
        // return callback(valor);
    } else {
        return callback(null);
    }
}

var servidor = rpc.server(); // crear el servidor RPC
var app = servidor.createApp("gestion_pacientes"); // crear aplicación de RPC

//Registramos los procedimientos
// app.registerAsync(obtenerPacientes);
app.registerAsync(obtenerCategorias);
app.registerAsync(obtenerModelos);
app.registerAsync(obtenerUbicaciones);
app.registerAsync(loginSanitario);
app.registerAsync(crearSanitario);
app.registerAsync(actualizarSanitario);
app.registerAsync(obtenerSanitario);
app.registerAsync(obtenerRecursos);
app.registerAsync(tiempoPendiente);
app.registerAsync(obtenerReservas);
app.registerAsync(obtenerResenyas);
app.registerAsync(crearResenya);
app.registerAsync(reservarRecurso);
app.registerAsync(cancelarReserva);
app.registerAsync(iniciarReserva);
app.registerAsync(finalizarReserva);
app.registerAsync(obtenerRecurso);
app.registerAsync(lecturaNFC);


