// rest.get(url, callback)
// rest.post(url, body, callback)
// rest.put(url, body, callback)
// rest.delete(url, callback)
// function callback(estado, respuesta) {...}

var login = document.getElementById("login");
var registro = document.getElementById("registro");
var main = document.getElementById("main");
var detalleRecurso = document.getElementById("detalleRecurso");
var actual = login;
var anterior = login;
var id_gestor = null;
var id_recurso = null;
var conexion = null;
var token = null;

function conToken(url){
    if (url.indexOf("?") == -1){
        return url + "?token=" + token;
    }
    return url + "&token=" + token;
}

var categoriaArray = [
    "",
    "Ecógrafos",
    "Pulsioxímetros",
    "Bombas de infusión"
];

var modeloArray = [
    "",
    "Ecógrafo Doppler SonoScan v4",
    "Pulsioxímetro SatuMax 200",
    "Bomba de Infusión Continua FlowMaster",
    "Ecógrafo Portátil PocketView"
];

// modeloCategoriaArray[idModelo] = idCategoria, para poder pintar la
// categoría de un recurso a partir de su modelo
var modeloCategoriaArray = [
    "",
    1, // Ecógrafo Doppler SonoScan v4       -> Ecógrafos
    2, // Pulsioxímetro SatuMax 200          -> Pulsioxímetros
    3, // Bomba de Infusión Continua FlowMaster -> Bombas de infusión
    1  // Ecógrafo Portátil PocketView       -> Ecógrafos
];

var ubicacionArray = [
    "",
    "Sala de Urgencias",
    "Laboratorio Central",
    "Almacén Principal"
];


var estadoArray = [
    "Operativo",
    "De baja",
    "En mantenimiento"
];

function cambiarVista(vistaNueva){
    actual.classList.remove("activa");
    actual.classList.add("inactiva");
    if (vistaNueva == main){
        obtenerDatosArea()
    }
    anterior = actual;
    actual = vistaNueva;
    actual.classList.remove("inactiva");
    actual.classList.add("activa");
}

function entrar(){
    var user = document.getElementById("user").value
    var contra = document.getElementById("contra").value

    console.log("Usuario:", user, "Contraseña:", contra);

    // El login es público: sin token
    rest.post("/api/gestores/login", {user: user, contra: contra}, function(estado, respuesta){
        console.log("Estado:", estado, "Respuesta:", respuesta);
        if (estado != 200){
            alert(respuesta);
            return;
        } else {
            id_gestor = parseInt(respuesta.id);
            token = respuesta.token;

            rest.get(conToken("/api/gestores/" + parseInt(id_gestor)), function(estado, respuesta){
                if (estado != 200){
                    alert(respuesta);
                    return;
                }
                document.getElementById("nombreGestor").innerHTML = respuesta.nombre + " " + respuesta.apellidos;
                document.getElementById("user").value = "";
                document.getElementById("contra").value = "";
                actualizarRecursos(null);

                conexion = new WebSocket("ws://localhost:4444", "conexion");

                cambiarVista(main);
                conexion.addEventListener("open", function () {
                    console.log("Conexión WebSocket abierta");
                    conexion.send(JSON.stringify({
                        operacion: "gestor",
                        id: id_gestor
                    }));
                });

                conexion.addEventListener("message", function (msg) {
                msg = JSON.parse(msg.data);
                switch (msg.operacion) {
                    case "resenyas": // 
                        var tablaAvisos = document.getElementById("avisosGestor");
                        tablaAvisos.getElementsByTagName("tbody")[0].innerHTML += 
                            "<tr style='background-color:" + msg.color + "'>" +
                            "<td>" + msg.fecha + "</td>" +
                            "<td>" + msg.origen + "</td>" +
                            "<td>" + msg.texto + "</td></tr>";
                        break;
                    
                }
            });
            })

    }

    });

}

function registrar(){
    cambiarVista(registro);
}

function cancelarReg(){
    if (anterior == login){
        document.getElementById("user").value = "";
        document.getElementById("contra").value = "";
        cambiarVista(login);
    } else {
        cambiarVista(main);
    }
}

function cerrarSesion(){
    conexion.close();
    token = null;
    var tablaAvisos = document.getElementById("avisosGestor");
    tablaAvisos.getElementsByTagName("tbody")[0].innerHTML = "";
    cambiarVista(login);
}

function actualizarRecursos(filtros){
    var url = "/api/recursos";
    if (filtros != null){
        url += filtros;
    }

    rest.get(conToken(url), function(estado, respuesta){
        console.log("Estado:", estado, "Recursos:", respuesta);
        if (estado != 200){
            alert("Error cargando los recursos");
            return;
        }
        var tabla = document.getElementById("tablaRecursos");
        tabla.getElementsByTagName("tbody")[0].innerHTML = "";
        for (var i=0; i < respuesta.length; i++){
            var idCategoria = modeloCategoriaArray[respuesta[i].modelo];
            tabla.getElementsByTagName("tbody")[0].innerHTML += "<tr><td>" + respuesta[i].numero_serie + "</td><td>" + categoriaArray[idCategoria] + "</td><td>" + modeloArray[respuesta[i].modelo] + "</td><td>" + ubicacionArray[respuesta[i].ubicacion] + "</td><td>" + estadoArray[respuesta[i].estado] + "</td><td>" + "<button onclick='abrir(" + respuesta[i].id + ")'>Abrir</button> <button onclick='borrar(" + respuesta[i].id + ")'>X</button></td></tr>";
        }
    });
}

function buscar(){
    var cate = document.getElementById("categoriaSelect").value;
    var mod = document.getElementById("modeloSelect").value;
    var ubi = document.getElementById("ubicacionSelect").value;
    var est = document.getElementById("estadoSelect").value;

    var filtros = "?";
    if (cate != ""){
        filtros += "categoria=" + cate + "&";
    }
    if (mod != ""){
        filtros += "modelo=" + mod + "&";
    }
    if (ubi != ""){
        filtros += "ubicacion=" + ubi + "&";
    }
    if (est != ""){
        filtros += "estado=" + est + "&";
    }
    console.log("Filtros:", filtros);
    actualizarRecursos(filtros);
}

function guardar(){
    var datos = {
        nombre:    document.getElementById("name").value,
        apellidos: document.getElementById("ape").value,
        usuario:   document.getElementById("userNuevo").value,
        password:  document.getElementById("contraNueva").value
    };

    var entero = true;
    for (var clave in datos){
        if (datos[clave] == ""){
            entero = false;
            break;
        }
    }
    
    if (anterior == login && entero){
        // El registro es público: sin token
        rest.post("/api/gestores", datos, function(estado, respuesta){
            alert(respuesta);
            if (estado == 201){
                document.getElementById("name").value = "";
                document.getElementById("ape").value = "";
                document.getElementById("userNuevo").value = "";
                document.getElementById("contraNueva").value = "";
                cambiarVista(login);
            }
        })
    } else if (anterior == login){
        alert("Por favor, rellena todos los campos");
    } else {
        rest.put(conToken("/api/gestores/" + id_gestor), datos, function(estado, respuesta){
            alert(respuesta);
            rest.get(conToken("/api/gestores/" + id_gestor), function(estado, respuesta){
                document.getElementById("nombreGestor").innerHTML = respuesta.nombre + " " + respuesta.apellidos;
            });
            document.getElementById("name").value = "";
            document.getElementById("ape").value = "";
            document.getElementById("userNuevo").value = "";
            document.getElementById("contraNueva").value = "";
            if (estado == 200){
                cambiarVista(main);
            }
        });
    }
}

function abrir(idRecurso){
    id_recurso = idRecurso;
    
    rest.get(conToken("/api/recursos/" + idRecurso), function(estado, respuestaRecurso){
        if (estado == 200) {
            actualizarSelectsRecurso(respuestaRecurso);            
            document.getElementById("detalleNumeroSerie").value = respuestaRecurso.numero_serie;
            document.getElementById("detalleEstado").value = respuestaRecurso.estado;
        }
    });

    actualizarReservas(idRecurso);
    actualizarResenyas(idRecurso);
    cambiarVista(detalleRecurso);
}

function borrar(id){
    conexion.send(JSON.stringify({
                    operacion: "borrarRecurso",
                    idRecurso: id,
                    idGestor: id_gestor
    }));
    rest.delete(conToken("/api/recursos/" + id), function(estado, respuesta){
        alert(respuesta);
    });
    actualizarRecursos(null);
}

function añadirRecurso(){
    document.getElementById("detalleCategoria").value = "";
    document.getElementById("detalleModelo").value = "";
    document.getElementById("detalleNumeroSerie").value = "";
    document.getElementById("detalleUbicacion").value = "";
    document.getElementById("detalleEstado").value = "";
    actualizarSelectsRecurso();
    cambiarVista(detalleRecurso);
}

function actualizarSelectsRecurso(datos){
    rest.get(conToken("/api/categorias"), function(estado, respuesta){
        if (estado == 200){
            var select = document.getElementById("detalleCategoria");
            select.innerHTML = "<option value=''>Selecciona una categoría</option>";
            for (var i=0; i < respuesta.length; i++){
                select.innerHTML += "<option value='" + respuesta[i].id + "'>" + respuesta[i].nombre + "</option>";
            }
            // datos si se llama desde abrir, null si desde añadirRecurso
            if(datos) select.value = datos.modelo;
        }
    });

    rest.get(conToken("/api/modelos"), function(estado, respuesta){
        if (estado == 200){
            var select = document.getElementById("detalleModelo");
            select.innerHTML = "<option value=''>Selecciona un modelo</option>";
            for (var i=0; i < respuesta.length; i++){
                select.innerHTML += "<option value='" + respuesta[i].id + "'>" + respuesta[i].nombre + "</option>";
            }
            if(datos) select.value = datos.modelo;
        }
    });

    rest.get(conToken("/api/ubicaciones"), function(estado, respuesta){
        if (estado == 200){
            var select = document.getElementById("detalleUbicacion");
            select.innerHTML = "<option value=''>Selecciona una ubicación</option>";
            for (var i=0; i < respuesta.length; i++){
                select.innerHTML += "<option value='" + respuesta[i].id + "'>" + respuesta[i].nombre + "</option>";
            }
            if(datos) select.value = datos.ubicacion;
        }
    });
}

function volverListado(){
    var tabla = document.getElementById("tablaReservas");
    tabla.getElementsByTagName("tbody")[0].innerHTML = "";

    var tabla = document.getElementById("tablaResenyas");
    tabla.getElementsByTagName("tbody")[0].innerHTML = "";

    id_recurso = null;
    console.log("Volviendo al listado. ID recurso:", id_recurso);
    cambiarVista(main);
}

function guardarRecurso(){
    var datos = {
        categoria: document.getElementById("detalleCategoria").value,
        modelo: document.getElementById("detalleModelo").value,
        numero_serie: document.getElementById("detalleNumeroSerie").value,
        ubicacion: document.getElementById("detalleUbicacion").value,
        estado: document.getElementById("detalleEstado").value
    };
    console.log("Datos del nuevo recurso:", datos);

    var entero = true;
    for (var clave in datos){
        if (datos[clave] == ""){
            entero = false;
            break;
        }
    }
    console.log("¿Datos completos?", entero, "ID recurso:", id_recurso);
    if (entero && id_recurso == null){
        rest.post(conToken("/api/recursos"), datos, function(estado, respuesta){
            alert(respuesta);
            if (estado == 201){
                conexion.send(JSON.stringify({
                    operacion: "recursos",
                    datos: datos,
                    idGestor: id_gestor
                }));
                actualizarRecursos(null);
                volverListado();
            }
        });
    } else {
        if (id_recurso == null){
            alert("Rellena todos los campos!");
            return;
        }
        rest.put(conToken("/api/recursos/" + id_recurso), datos, function(estado, respuesta){
            alert(respuesta);
        });
        id_recurso = null;
        actualizarRecursos(null);
        volverListado();
    }
}

function actualizarReservas(id_rec){
    rest.get(conToken("/api/recursos/"+id_rec+"/reservas"),function(estado, respuesta){
        var tabla = document.getElementById("tablaReservas");
        tabla.getElementsByTagName("tbody")[0].innerHTML = "";
        for (var i=0; i < respuesta.length; i++){
            var color = cogerColor(respuesta[i].horas_estimadas, respuesta[i].fecha_peticion, respuesta[i].fecha_inicio, respuesta[i].fecha_fin);
            var sanitario = respuesta[i].sanitario;
            var horas = respuesta[i].horas_estimadas;
            var fpet = respuesta[i].fecha_peticion ? new Date(respuesta[i].fecha_peticion).toLocaleString('es-ES') : "";
            var fi   = respuesta[i].fecha_inicio   ? new Date(respuesta[i].fecha_inicio).toLocaleString('es-ES')   : "";
            var ff   = respuesta[i].fecha_fin   ? new Date(respuesta[i].fecha_fin).toLocaleString('es-ES')    : "";

            rest.get(conToken("/api/sanitarios/" + sanitario), function(estado, respuestaSanitario){
                if (estado == 200){
                    var nombre_sanitario = respuestaSanitario.nombre + " " + respuestaSanitario.apellidos;
                } else {
                    console.log("Error cargando datos del sanitario con id " + sanitario);
                }
                
                tabla.getElementsByTagName("tbody")[0].innerHTML += '<tr class="' + color + '"><td>' + nombre_sanitario + '</td><td>' + horas + '</td><td>' + fpet + '</td><td>' + fi + '</td><td>' + ff + '</td></tr>';
            });

        }
    });
}

function actualizarResenyas(id_rec){
    rest.get(conToken("/api/recursos/"+id_rec+"/resenyas"),function(estado, respuesta){
        var tabla = document.getElementById("tablaResenyas");
        tabla.getElementsByTagName("tbody")[0].innerHTML = "";
        for (var i=0; i < respuesta.length; i++){
            var id_valoracion = respuesta[i].id;
            var sanitario = respuesta[i].sanitario;
            var valoracion = respuesta[i].valor;
            var comentario = respuesta[i].descripcion;
            var fecha = respuesta[i].fecha ? new Date(respuesta[i].fecha).toLocaleString('es-ES') : "";
            
            rest.get(conToken("/api/sanitarios/" + sanitario), function(estado, respuestaSanitario){
                if (estado == 200){
                    var nombre_sanitario = respuestaSanitario.nombre + " " + respuestaSanitario.apellidos;
                } else {
                    console.log("Error cargando datos del sanitario con id " + sanitario);
                }
                

                tabla.getElementsByTagName("tbody")[0].innerHTML += "<tr><td>" + fecha + "</td><td>" + nombre_sanitario + "</td><td>" + valoracion + "</td><td>" + comentario + "</td></tr>";
            });

        }
    });
}

function cogerColor(horas, fpet, fi, ff){
    const ahora = new Date();
    fpet = fpet ? new Date(fpet) : null;
    fi = fi ? new Date(fi) : null;
    ff = ff ? new Date(ff) : null;
    let horasUsando = ((ahora - fi) / (1000 * 60 * 60)).toFixed(0);
    console.log("ff:", ff);
    if (ff){ 
        console.log("blanco");
        return "blanco"
    } else if (!fi){
        console.log("verde");
        return "verde"
    } else if (horasUsando > horas){
        console.log("rojo");
        return "rojo"
    } else {
        console.log("azul");
        return "azul"
    }
}

// https://undefined.ua.es/telemedicina/api/datos

var id_area = 12;

function obtenerReservas(callback){
    rest.get(conToken("/api/recursos"), function(estado, respuesta){
        if (estado != 200){
            console.log("Error cargando los recursos");
            return;
        }

        var recursos = respuesta;
        var reservas = [];
        var pendientes = recursos.length;

        if (pendientes == 0){
            callback(reservas);
            return;
        }

        for (var i=0; i < recursos.length; i++){
            rest.get(conToken("/api/recursos/" + recursos[i].id + "/reservas"), function(estado, respuestaReservas){
                if (estado == 200){
                    for (var j=0; j < respuestaReservas.length; j++){
                        reservas.push(respuestaReservas[j]);
                    }
                } else {
                    console.log("Error cargando las reservas del recurso con id " + recursos[i].id);
                }

                pendientes--;
                if (pendientes == 0){
                    callback(reservas);
                }
            });
        }
    });
}

function introducirDatosArea(){

    obtenerReservas(function(reservas){
        var datos = [];
        var pendientes = reservas.length;

        if (pendientes == 0){
            enviarDatos(datos);
            return;
        }

        reservas.forEach(function(reserva){

            rest.get(conToken("/api/sanitarios/" + reserva.sanitario), function(estado, respuestaSanitario){
                var nombre = "";
                var apellidos = "";
                if (estado == 200){
                    nombre = respuestaSanitario.nombre;
                    apellidos = respuestaSanitario.apellidos;
                }

                rest.get(conToken("/api/recursos/" + reserva.recurso), function(estado, respuestaRecurso){
                    var categoria = "";
                    if (estado == 200){
                        categoria = categoriaArray[modeloCategoriaArray[respuestaRecurso.modelo]];
                    }

                    datos.push({
                        "nombre": nombre,
                        "apellidos": apellidos,
                        "categoria": categoria,
                        "horas_estimadas": reserva.horas_estimadas,
                        "fec_pet": new Date(reserva.fecha_peticion).toISOString().split('T')[0],
                        "fec_ini": new Date(reserva.fecha_inicio).toISOString().split('T')[0],
                        "fec_fin": new Date(reserva.fecha_fin).toISOString().split('T')[0]
                    });

                    pendientes--;
                    if (pendientes == 0){
                        enviarDatos(datos);
                    }
                });
            });
        });
    });
}

function enviarDatos(datos){

    var body = {
        "id_area": id_area,
        "fecha": new Date().toISOString().split('T')[0],
        "datos": datos
    }
    // Servidor externo: sin token
    rest.post("https://undefined.ua.es/telemedicina/api/datos", body, function(estado, resp){
        console.log("Estado:", estado, "Respuesta:", resp);
    });
}

function obtenerDatosArea(){
    var areas = {
        1:  {nombre: "Alergología",       usos: 0},
        2:  {nombre: "Anestesiología",    usos: 0},
        3:  {nombre: "Cardiología",       usos: 0},
        4:  {nombre: "Cirugía General",   usos: 0},
        5:  {nombre: "Dermatología",      usos: 0},
        6:  {nombre: "Aparato Digestivo", usos: 0},
        7:  {nombre: "Endocrinología",    usos: 0},
        8:  {nombre: "Ginecología",       usos: 0},
        9:  {nombre: "Hematología",       usos: 0},
        10: {nombre: "Medicina Interna",  usos: 0},
        11: {nombre: "Neumología",        usos: 0},
        12: {nombre: "Neurología",        usos: 0},
        13: {nombre: "Oftalmología",      usos: 0},
        14: {nombre: "Oncología",         usos: 0},
        15: {nombre: "Pediatría",         usos: 0},
        16: {nombre: "Psiquiatría",       usos: 0},
        17: {nombre: "Traumatología",     usos: 0},
        18: {nombre: "Urología",          usos: 0}
    };

    // Servidor externo: sin token
    rest.get("https://undefined.ua.es/telemedicina/api/datos", function(estado, resp){
        for (var i = 0; i < resp.length; i++){
            var area = resp[i].id_area;
            if (area < 19){
                areas[area].usos += resp[i].datos.length;
            }
        }

        var lista = [];
        for (var id in areas){
            lista.push({id_area: id, nombre: areas[id].nombre, usos: areas[id].usos});
        }

        // Ascendente 
        lista.sort(function(a, b){
            return b.usos - a.usos;
        });

        hacerTabla(lista);
    })
}

function hacerTabla(lista){
    var indice = 1;
    var tabla = document.getElementById("tablaAreas");
    tabla.getElementsByTagName("tbody")[0].innerHTML = "";
    
    for (var i = 0; i < lista.length; i++){
        tabla.getElementsByTagName("tbody")[0].innerHTML += "<tr><td>" + indice + "</td><td>" + lista[i].nombre + "</td><td>" + lista[i].usos + "</td></tr>";
        indice++;
    }
}