# WACHUMA — desarrollo, cultivo y animación de cactus columnares

Estado: contrato de arquitectura para generadores procedurales. La escena no representa una malla que se deforma, sino un organismo con historia. Este documento separa evidencia anatómica, entradas de cultivo y reglas visuales hipotéticas; no predice la horticultura de un ejemplar concreto.

## Modelo de estado

```text
X(t) = (G(t), M(t), A(t), W(t), E(t), H(t))
```

- `G`: grafo de tallos; la columna inicial, cada brazo y cada pup basal son nodos con relación padre-hijo.
- `M`: meristemos vivos; cada punta activa puede producir tejido.
- `A`: areolas persistentes, con `id`, edad, posición, estado y progenie.
- `W`: hidratación/turgencia reversible.
- `E`: luz, temperatura, riego, estrés, poda o daño.
- `H`: historia inmutable de nacimientos, transiciones, semilla y parámetros.

La malla es una proyección de este estado. No se obtiene una rama interpolando un tubo adulto, una flor pegando un asset aleatorio ni reordenando las areolas entre frames.

## Restricciones de evidencia

Las areolas de Cactaceae son yemas axilares persistentes. La expansión de las costillas lleva las areolas hacia afuera y hacia abajo; una misma areola puede producir espinas, rama o flor. Toda rama y toda flor debe referenciar la `id` de una areola existente. Las areolas más jóvenes pertenecen a una corona periférica del ápice, no al punto matemático central.

Las costillas/surcos permiten cambios de volumen hídrico. Esto exige distinguir la respiración reversible del agua de la producción irreversible de tejido. Para *Echinopsis pachanoi*, el perfil objetivo es de costillas anchas, redondeadas y areolas sobre las crestas; las flores se asocian a areolas superiores y tienen apertura nocturna. No se fija ángulo áureo, frecuencia de ramificación ni gatillo cuantitativo de floración.

Fuentes:

- [Mauseth: anatomía y relación areola--costilla--rama](https://pmc.ncbi.nlm.nih.gov/articles/PMC2803597/)
- [Mauseth et al.: actividad apical y posición de areolas](https://pmc.ncbi.nlm.nih.gov/articles/PMC12401885/)
- [Rib-and-furrow y ajuste hídrico](https://www.sciencedirect.com/science/article/abs/pii/S014019631630204X)
- [Ficha morfológica de *E. pachanoi*](https://www.cactus-art.biz/schede/TRICHOCEREUS/Trichocereus_pachanoi/Trichocereus_pachanoi/Trichocereus_pachanoi.htm)

## Nacimiento de módulos y superficie

Cada primordio/areola recibe identidad al nacer:

```text
a_k = (id_k, t_k, theta_k, rib_k, state_k)
theta_k = theta_0 + k alpha mod 2pi
s_k(t) = s_apex - D(t - t_k)
D(0) = 0; D'(age) >= 0
```

`alpha` es un parámetro por espécimen/clon, nunca una constante Fibonacci implícita. Las costillas son ortóstiquias: la trayectoria material de estos módulos, no rayas aplicadas a una superficie. `D` tiene un tramo juvenil suave en la corona y uno maduro casi lineal.

```text
Sigma(s,theta,t) = (r cos(theta), r sin(theta), z)
r = R(s,t) + A(s,t) f_n(theta - Phi(s,t)) + delta_nodes(s,theta,t)

delta_nodes = sum_k taper(s_k) [
  a_g K((s-s_k)/ell_s, d(theta,theta_k)/ell_theta)
  - a_n K((s-(s_k+delta_s))/ell_s, d(theta,theta_k)/ell_theta)
]
```

`f_n` es un perfil C2 periódico, ancho y redondeado. El primer kernel C2 compacto produce el crecimiento modular tenue de la areola; el segundo, desplazado hacia el ápice, forma la depresión sobre ella. Ambos se anulan suavemente en el polo para evitar una estrella o una tapa.

## Escalas de animación

| Escala | Estado | Resultado | Reversible |
| --- | --- | --- | --- |
| horas--días | `W` | apertura/cierre leve de costillas | sí |
| semanas--meses | `M`, `A` | elongación, nacimiento y advección | no |
| estaciones--años | yemas | pups, brazos, botones y flores | parcialmente |

```text
dW/dt = (W_target(E,t) - W) / tau_W
R(s,t) = R_dry(s) [1 + eta(s) W(t)]

dH_v/dt = q_v g(E,t)
g(E,t) = sigmoid(w_T T + w_L L + w_W W - w_S Stress)
```

La sigmoide es una interfaz calibrable, no una ley fisiológica literal. Todo valor, unidad y fuente debe vivir en un perfil versionado.

## Máquina de estados de areola

```text
nascent -> spinous -> dormant
dormant -> vegetative -> shoot_meristem
dormant -> floral -> floral_bud -> anthesis -> senescent
dormant -> aborted
```

```text
S_veg(k,t) = w_m maturity_k + w_r reserve_v - w_d dominance(k,t)
             + w_x disturbance_v - w_c competition_v
S_floral(k,t) = u_m maturity_k + u_e exposure_k + u_q seasonal_cue(E,t)
                - u_d dominance(k,t) - u_s stress_v
dominance(k,t) = D0(t) exp(-distance_on_shoot(k,apex)/lambda_D)
```

Una transición necesita precondiciones, umbral y registro en `H`. Poda o daño pueden reducir `D0` y liberar yemas como escenario declarado. La dominancia apical tiene respaldo general, pero pesos y umbrales de pachanoi son hipótesis calibrables. [Revisión](https://pmc.ncbi.nlm.nih.gov/articles/PMC10400159/)

## Brazos, pups y floración

Un tallo hijo nace desde una areola vegetativa:

```text
child.origin = Sigma_parent(s_k,theta_k,t_birth)
child.parent_areole = id_k
T_child(0) = normalize(cos(beta) N_parent + sin(beta) e_z)
dT_child/dt = kappa [e_z - (T_child . e_z) T_child]
```

Sale lateralmente y se orienta hacia arriba; desde entonces genera meristemo, corona, costillas, areolas e historia propios. Se soportan dos modos: **pup/corona basal**, prioritario para una mata adulta, y **brote axilar lateral**, que luego se endereza.

La flor es la otra ruta de una areola madura y alta:

```text
Q_f(t) = integral_0^t floral_gate(E(tau)) d tau
allow_flower(k) iff mature(k) and upper_zone(k)
                    and Q_f > Theta_f and S_floral > theta_f
```

Su ciclo visual es `floral_bud -> elongation -> nocturnal anthesis -> senescence`. `floral_gate` se etiqueta como hipótesis de cultivo: no promete una fecha de floración ni un disparador universal por riego, luz o frío.

## Datos de cultivo e invariantes

```text
CultivationEvent = {
  time, kind, value, unit, source,
  specimen_or_culture_id, confidence, notes
}
```

`kind` incluye `irrigation`, `light_exposure`, `temperature`, `pruning`, `damage`, `repotting` y `observation`. Una guía de cultivo es un claim versionado con fuente, alcance y evidencia; una observación no se promociona a regla universal.

Cada perfil serializa:

```text
rib_count, alpha, plastochron, D(age), hydration_response,
dominance_length, branch_threshold, floral_threshold,
geometry_seed, model_version
```

Invariantes: una areola conserva identidad y nacimiento; rama/flor referencia areola y transición válida; crecimiento añade historia; agua no cambia topología; todo hijo genera módulos propios; y falta de evidencia conserva `dormant`/`UNKNOWN`, no inventa una decisión.

## Primer slice

```text
seco -> riego -> expansión reversible de costillas
-> nacimiento apical de areolas -> advección/elongación
-> activación explícita de una yema basal
-> hijo con ápice y costillas propios
```

La flor llega como segunda ruta de la misma máquina de estados, en un escenario marcado `procedural-hypothesis`. La calibración real requiere series temporales del mismo espécimen con escala, identidad de clon, fechas, cultivo y activación observada de areolas. Hasta entonces, scores, umbrales, ritmos y filotaxis son decisiones de política procedural, no afirmaciones universales sobre el mundo.
