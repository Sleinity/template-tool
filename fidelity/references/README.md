# Approved renderer references

Approved references live under `approved/<fixture-id>/<surface>/`. The initial
16 references were explicitly promoted from the reviewed Milestone 1 final
baseline as current-behavior evidence, not source-design fidelity acceptance.

Future candidates are promoted only with `pnpm fidelity:update -- --fixture
<id> --surface <surface> --reason "<fidelity reason>"`.

Embedded `preview.png` files are source references, not renderer goldens.
Normal baseline and comparison runs never write beneath this directory.
