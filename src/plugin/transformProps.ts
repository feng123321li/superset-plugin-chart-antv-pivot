/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import {
    ChartProps,
    DataRecord,
    extractTimegrain,
    GenericDataType,
    getTimeFormatter,
    getTimeFormatterForGranularity,
    smartDateFormatter,
    TimeFormats,
    TimeseriesDataRecord,
    AdhocMetric
} from '@superset-ui/core';

import {DateFormatter} from '../types';

export default function transformProps(chartProps: ChartProps) {
    /**
     * This function is called after a successful response has been
     * received from the chart data endpoint, and is used to transform
     * the incoming data prior to being sent to the Visualization.
     *
     * The transformProps function is also quite useful to return
     * additional/modified props to your data viz component. The formData
     * can also be accessed from your SupersetPluginChartAntvPivot.tsx file, but
     * doing supplying custom props here is often handy for integrating third
     * party libraries that rely on specific props.
     *
     * A description of properties in `chartProps`:
     * - `height`, `width`: the height/width of the DOM element in which
     *   the chart is located
     * - `formData`: the chart data request payload that was sent to the
     *   backend.
     * - `queriesData`: the chart data response payload that was received
     *   from the backend. Some notable properties of `queriesData`:
     *   - `data`: an array with data, each row with an object mapping
     *     the column/alias to its value. Example:
     *     `[{ col1: 'abc', metric1: 10 }, { col1: 'xyz', metric1: 20 }]`
     *   - `rowcount`: the number of rows in `data`
     *   - `query`: the query that was issued.
     *
     * Please note: the transformProps function gets cached when the
     * application loads. When making changes to the `transformProps`
     * function during development with hot reloading, changes won't
     * be seen until restarting the development server.
     */
    const {
        width,
        height,
        formData,
        rawFormData,
        queriesData,
        datasource
    } = chartProps;
    const {
        groupbyRows,
        groupbyColumns,
        metrics,
        dateFormat,
        rowTotals,
        rowSubTotals,
        colTotals,
        colSubTotals,
        rowTotalsRename,
        colTotalsRename,
        transposePivot,
    } = formData;

    const {colnames, coltypes} = queriesData[0];
    const data = queriesData[0].data as TimeseriesDataRecord[];


    const granularity = extractTimegrain(rawFormData);

    const {DATABASE_DATETIME} = TimeFormats;

    function isNumeric(key: string, data: DataRecord[] = []) {
        return data.every(
            record =>
                record[key] === null ||
                record[key] === undefined ||
                typeof record[key] === 'number',
        );
    }


    console.log('chartProps is', chartProps);


    // Convert metrics to an array of labels
    const formattedMetrics = Array.isArray(metrics)
        ? metrics.map((metric: string | AdhocMetric) =>
            typeof metric === 'string' ? metric : (metric.label as string),
        )
        : [metrics];


    //转置透视图,默认false
    const rows = transposePivot ? groupbyColumns : groupbyRows;
    const columns = transposePivot ? groupbyRows : groupbyColumns;

    const fields = {
        "rows": rows,
        "columns": columns,
        "values": formattedMetrics,
        "valueInCols": true
    };

    console.log('fields is', fields);


    const meta = Object.entries(datasource.verboseMap).map(([field, name]) => ({
        field,
        name,
    }));


    console.log('meta is', meta);

    //获取日期字段
    const dateFormatters = colnames
        .filter(
            (colname: string, index: number) =>
                coltypes[index] === GenericDataType.TEMPORAL,
        )
        .reduce(
            (
                acc: Record<string, DateFormatter | undefined>,
                temporalColname: string,
            ) => {
                let formatter: DateFormatter | undefined;
                if (dateFormat === smartDateFormatter.id) {
                    if (granularity) {
                        // time column use formats based on granularity
                        formatter = getTimeFormatterForGranularity(granularity);
                    } else if (isNumeric(temporalColname, data)) {
                        formatter = getTimeFormatter(DATABASE_DATETIME);
                    } else {
                        // if no column-specific format, print cell as is
                        formatter = String;
                    }
                } else if (dateFormat) {
                    formatter = getTimeFormatter(dateFormat);
                }
                if (formatter) {
                    acc[temporalColname] = formatter;
                }
                return acc;
            },
            {},
        );


    // 日期控件转换
    const transformedData = data.map((item) => {
        const temporalColumns = Object.keys(dateFormatters);
        const transformedItem: Record<string, any> = {};
        temporalColumns.forEach((temporalColname) => {
            const formatter = dateFormatters[temporalColname];
            if (formatter && typeof formatter === 'function') {
                transformedItem[temporalColname] = formatter(new Date(item[temporalColname]));
            } else {
                // If no formatter found, keep the original value
                transformedItem[temporalColname] = item[temporalColname];
            }
        });
        // Copy non-temporal columns to the transformed item
        Object.keys(item).forEach((colname) => {
            if (!temporalColumns.includes(colname)) {
                transformedItem[colname] = item[colname];
            }
        });
        return transformedItem;
    });


    // Calculate row totals
    const rowTotalsMap: Record<string, number> = {};
    transformedData.forEach((item) => {
        const rowKey = groupbyRows.map((row) => item[row]).join('-');
        if (!rowTotalsMap[rowKey]) {
            rowTotalsMap[rowKey] = 0;
        }
        formattedMetrics.forEach((metric) => {
            rowTotalsMap[rowKey] += item[metric] || 0;
        });
    });

    const rowTotalsData = Object.keys(rowTotalsMap).map((rowKey) => {
        const rowTotalsItem: Record<string, any> = {};
        groupbyRows.forEach((row, index) => {
            rowTotalsItem[row] = rowKey.split('-')[index];
        });
        formattedMetrics.forEach((metric) => {
            rowTotalsItem[metric] = rowTotalsMap[rowKey];
        });
        return rowTotalsItem;
    });

    // Calculate column totals
    const colTotalsMap: Record<string, number> = {};
    transformedData.forEach((item) => {
        const colKey = groupbyColumns.map((col) => item[col]).join('-');
        if (!colTotalsMap[colKey]) {
            colTotalsMap[colKey] = 0;
        }
        formattedMetrics.forEach((metric) => {
            colTotalsMap[colKey] += item[metric] || 0;
        });
    });

    const colTotalsData = Object.keys(colTotalsMap).map((colKey) => {
        const colTotalsItem: Record<string, any> = {};
        groupbyColumns.forEach((col, index) => {
            colTotalsItem[col] = colKey.split('-')[index];
        });
        formattedMetrics.forEach((metric) => {
            colTotalsItem[metric] = colTotalsMap[colKey];
        });
        return colTotalsItem;
    });

    // Sum of row totals
    const sumOfRowTotals = rowTotalsData.reduce((sum, item) => {
        formattedMetrics.forEach((metric) => {
            sum[metric] = (sum[metric] || 0) + item[metric];
        });
        return sum;
    }, {});

    // Combine row and column totals into totalData array
    const totalData = [...rowTotalsData, ...colTotalsData, sumOfRowTotals];

    // console.log('totalData is', totalData);


    return {
        width,
        height,
        data: transformedData,
        // and now your control data, manipulated as needed, and passed through as props!
        fields,
        meta,
        groupbyRows,
        groupbyColumns,
        rowTotals,
        rowSubTotals,
        colTotals,
        colSubTotals,
        totalData,
        rowTotalsRename,
        colTotalsRename
    };
}
