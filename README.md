`npm install`

`node ws.js`
`node faye.js`
`node ... whatever else`

ws:

```
Running 40000 roundtrips of 64 B binary data:   4.8s..  523.23 kB/s
Running 20000 roundtrips of 16 kB binary data:  4.2s..  73.81 MB/s
Running 4000 roundtrips of 128 kB binary data:  3.9s..  128.67 MB/s
Running 400 roundtrips of 1 MB binary data:     2.8s..  144.46 MB/s
Running 40000 roundtrips of 64 B text data:     5.5s..  454.71 kB/s
Running 20000 roundtrips of 16 kB text data:    11.3s.. 27.68 MB/s
Running 4000 roundtrips of 128 kB text data:    15.2s.. 32.87 MB/s
Running 400 roundtrips of 1 MB text data:       11.9s.. 33.55 MB/s
Running 1 roundtrips of 500 MB binary data:     5.9s..  84.08 MB/s
```

faye:

```
Running 40000 roundtrips of 64 B binary data:   5.7s..  441.85 kB/s
Running 20000 roundtrips of 16 kB binary data:  9.8s..  31.95 MB/s
Running 4000 roundtrips of 128 kB binary data:  13.2s.. 37.87 MB/s
Running 400 roundtrips of 1 MB binary data:     10.3s.. 38.79 MB/s
Running 40000 roundtrips of 64 B text data:     6.8s..  368.41 kB/s
Running 20000 roundtrips of 16 kB text data:    17.5s.. 17.91 MB/s
Running 4000 roundtrips of 128 kB text data:    34.2s.. 14.61 MB/s
Running 400 roundtrips of 1 MB text data:       52.8s.. 7.58 MB/s
Running 1 roundtrips of 500 MB binary data: ... never actually completes
```

worlize:

```
Running 40000 roundtrips of 64 B binary data:   6.3s..  397.2 kB/s
Running 20000 roundtrips of 16 kB binary data:  12.1s.. 25.93 MB/s
Running 4000 roundtrips of 128 kB binary data:  17.1s.. 29.23 MB/s
Running 400 roundtrips of 1 MB binary data:     10.9s.. 36.58 MB/s
Running 40000 roundtrips of 64 B text data:     7s ...  356.68 kB/s
Running 20000 roundtrips of 16 kB text data:    18.7s.. 16.67 MB/s
Running 4000 roundtrips of 128 kB text data:    26.1s.. 19.14 MB/s
Running 400 roundtrips of 1 MB text data:       20.9s.. 19.13 MB/s
Running 1 roundtrips of 500 MB binary data:     19.9s.. 25.07 MB/s
```