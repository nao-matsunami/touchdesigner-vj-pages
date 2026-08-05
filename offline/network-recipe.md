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

## Auto Build

`create_feedback_network.py` can create this starter network inside TouchDesigner.

1. Create a Text DAT named `create_feedback_network`.
2. Paste the Python file into the Text DAT.
3. Run:

```python
exec(op("create_feedback_network").text)
```

The script creates `daily_feedback_top_network`, clears its previous children,
builds the TOP/CHOP chains, and assigns loop expressions to Transform,
Displace, and Level parameters.
