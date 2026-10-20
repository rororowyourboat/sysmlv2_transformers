default:
    @just --list
build:
    node scripts/build.mjs
validate engine:
    node scripts/build.mjs --engine {{quote(engine)}}
check:
    node --test tests/*.test.mjs
serve:
    node scripts/serve.mjs
