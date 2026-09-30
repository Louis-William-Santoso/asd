<?php

namespace App\Http\Controllers;

use App\Services\Influx;
use Illuminate\Http\Request;
use Throwable;

class SensorController extends Controller
{
    /**
     * Latest reading. 503 rather than null-filled zeros: a fire dashboard that
     * renders 0 when Influx is down is worse than one that says "no data".
     */
    public function status(Influx $influx)
    {
        try {
            $latest = $influx->latest();
        } catch (Throwable $e) {
            report($e);

            return response()->json(['online' => false, 'error' => 'InfluxDB tidak dapat dihubungi'], 503);
        }

        return response()->json([
            'online' => $latest !== null,
            'reading' => $latest,
            'thresholds' => ['gas' => config('influxdb.gas_threshold')],
            'adc_max' => config('influxdb.adc_max'),
        ]);
    }

    public function history(Request $request, Influx $influx)
    {
        $data = $request->validate([
            'limit' => ['nullable', 'integer', 'min:1', 'max:500'],
            'minutes' => ['nullable', 'integer', 'min:1', 'max:10080'],
        ]);

        try {
            $points = $influx->history(
                limit: (int) ($data['limit'] ?? 50),
                minutes: (int) ($data['minutes'] ?? 60),
            );
        } catch (Throwable $e) {
            report($e);

            return response()->json(['error' => 'InfluxDB tidak dapat dihubungi'], 503);
        }

        return response()->json(['data' => $points]);
    }
}
