# TouchDesigner Network Recipe

Initial daily patch: `Feedback TOP Network`

Suggested TOP chain:

```text
Noise TOP
  -> Level TOP
  -> Transform TOP
  -> Feedback TOP
  -> Composite TOP
  -> Displace TOP
  -> Level TOP
  -> Movie File Out TOP
```

Suggested CHOP controls:

```text
Timer CHOP
  -> Math CHOP
  -> Pattern CHOP
  -> Export to Transform / Level / Displace parameters
```

Use a 16 second timer cycle for a clean loop.
