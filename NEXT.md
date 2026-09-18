# NEXT — open work, observations, suggestions

Written from memory at the end of the 2026-09-07 session, without re-reading
the tree. Not a contract.

**Nothing here was audited.** The session worked on FARMAKSIA, VIZZ, PUPILA,
XIO and MAK. This repository was checked only for its git state -- clean, on
`fix/enforce-content-schemas`, synchronised with its remote -- and no test,
schema or dataset was run or read. Anything below is recollection from earlier
notes, not a measurement taken here.

## What earlier notes say, and should be re-verified

**The database is PostgreSQL, not sqlite.** PostgreSQL 15 with PostGIS,
natively on `127.0.0.1:5432`, database `wachuma`, user `mak_wachuma`,
credentials in `~/.config/wachuma/database.env`. It gets called "la base
sqlite" in conversation and there is no sqlite anywhere in the project. That
mismatch is worth correcting in speech, because it sends an agent looking for a
file.

**The toolchain is not the system default.** Node 22 lives under
`~/.local/opt`, pnpm 11 came from corepack into `~/.local/bin`, and `~/.bashrc`
puts both on PATH. The box's own Node was 18 with no pnpm.

**The repository carries no dotenv**, so every `pnpm` command needs the
environment exported first or `db:verify` dies claiming `DATABASE_URL` is
missing. And `pnpm --filter <pkg> build` fails on workspace types unless the
turbo build ran first.

**`pnpm verify:release` is the verdict**, the same gates CI runs -- and it stops
at the first failure. A green-looking run after a fix can still hide the next
broken gate, so it has to be rerun whole. Turbo also skips dependent test tasks
after a failure, which is how one red fixture once masked a second red
expectation.

pnpm 11 writes project config into `pnpm-workspace.yaml`, which is versioned,
not `.npmrc`, so `pnpm config set` dirties the repository unless it is passed
`--location user`. New dependencies with build scripts need an explicit entry in
that file's `allowBuilds`.

## Scope, which is the thing most likely to drift

WACHUMA is the wachuma: _Echinopsis pachanoi_, permanently. It is not a general
biocultural platform whose first case happens to be a cactus. The scope admits
two orbits around that axis: related cacti as secondary material, and the fungi
that attack or rot the cactus -- not mycology in general.

The README's own framing, a "first public cut" with species "reserved for
future research", reads like a multi-species atlas in progress. An agent that
believes it will keep building generic platform scaffolding instead of the
monograph. Before adding a tool, importer, species or dataset, the question is
whether it collaborates with the pachanoi, its related cacti, its rot fungi or
the 3D representation.

## Suggestion

The branch name says content schemas are being enforced. If that work adds
schema validation, the gate-ordering problem above matters: a schema failure
that stops `verify:release` early will hide whatever comes after it. Worth
knowing which gate runs first before trusting a green run.
