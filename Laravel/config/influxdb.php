<?php

return [

    /*
    |--------------------------------------------------------------------------
    | InfluxDB
    |--------------------------------------------------------------------------
    |
    | Sensor readings from the Raspberry Pi are written to InfluxDB by
    | `php artisan mqtt:listen` and read back for the dashboard.
    |
    */

    'url' => env('INFLUXDB_URL', 'http://127.0.0.1:8086'),

    'token' => env('INFLUXDB_TOKEN'),

    'org' => env('INFLUXDB_ORG', 'fireguard'),

    'bucket' => env('INFLUXDB_BUCKET', 'fireguard'),

    'measurement' => env('INFLUXDB_MEASUREMENT', 'gas_reading'),

    /*
    | The ESP32 sketch hardcodes this as its "bad" trigger: analogRead(34) > 2000.
    | Duplicated here so the dashboard can draw the same line and so a payload
    | that arrives without a status can still be classified.
    */
    'gas_threshold' => (int) env('GAS_THRESHOLD', 2000),

    'adc_max' => (int) env('ADC_MAX', 4095),

];
