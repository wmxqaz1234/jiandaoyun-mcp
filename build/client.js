import axios from 'axios';
export class JianDaoYunClient {
    config;
    axios;
    constructor(config) {
        this.config = {
            ...config,
            baseUrl: config.baseUrl || 'https://api.jiandaoyun.com/api'
        };
        this.axios = axios.create({
            baseURL: this.config.baseUrl,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.config.appKey}`
            }
        });
    }
    async getFormFields(formId) {
        try {
            const response = await this.axios.post('/v5/app/entry/widget/list', {
                app_id: this.config.appId,
                entry_id: formId
            });
            // 检查是否有错误响应格式
            if (response.data.code !== undefined && response.data.code !== 0) {
                throw new Error(`Failed to get form fields: ${response.data.msg}`);
            }
            // API返回格式: {widgets: [...], sysWidgets: ...}
            const widgets = response.data.widgets || [];
            return this.transformFields(Array.isArray(widgets) ? widgets : []);
        }
        catch (error) {
            if (axios.isAxiosError(error)) {
                throw new Error(`API request failed: ${error.response?.data?.msg || error.message}`);
            }
            throw error;
        }
    }
    transformFields(widgets) {
        return widgets.map(widget => {
            const field = {
                key: widget.name,
                name: widget.label,
                type: this.mapFieldType(widget.type),
                required: widget.required || false
            };
            if (widget.type === 'subform' && widget.items) {
                field.subForm = {
                    fields: this.transformFields(widget.items)
                };
            }
            return field;
        });
    }
    mapFieldType(apiType) {
        const typeMap = {
            'text': 'text',
            'textarea': 'text',
            'number': 'number',
            'date': 'date',
            'datetime': 'datetime',
            'sn': 'serial_no',
            'address': 'address',
            'location': 'location',
            'image': 'image',
            'file': 'file',
            'single_select': 'select',
            'multiple_select': 'multi_select',
            'checkbox': 'checkbox',
            'radio': 'radio',
            'user': 'user',
            'dept': 'dept',
            'subform': 'subform',
            'formula': 'formula',
            'phone': 'phone'
        };
        return typeMap[apiType] || 'text';
    }
    async submitData(options) {
        try {
            const dataArray = Array.isArray(options.data) ? options.data : [options.data];
            if (dataArray.length > 100) {
                throw new Error('Batch submission limit is 100 records');
            }
            const isBatch = dataArray.length > 1;
            const endpoint = isBatch ? '/v5/app/entry/data/batch_create' : '/v5/app/entry/data/create';
            const requestData = {
                app_id: this.config.appId,
                entry_id: options.formId
            };
            if (isBatch) {
                requestData.data_list = dataArray.map(record => this.formatDataForSubmission(record));
            }
            else {
                requestData.data = this.formatDataForSubmission(dataArray[0]);
            }
            if (options.transactionId) {
                requestData.transaction_id = options.transactionId;
            }
            if (options.dataCreator) {
                requestData.data_creator = options.dataCreator;
            }
            if (options.isStartWorkflow !== undefined) {
                requestData.is_start_workflow = options.isStartWorkflow;
            }
            if (options.isStartTrigger !== undefined) {
                requestData.is_start_trigger = options.isStartTrigger;
            }
            console.log('提交请求数据:', JSON.stringify(requestData, null, 2));
            const response = await this.axios.post(endpoint, requestData);
            console.log('API响应:', JSON.stringify(response.data, null, 2));
            if (response.data.code !== undefined && response.data.code !== 0) {
                // 创建包含详细错误信息的错误对象
                const error = new Error(`Failed to submit data: ${response.data.msg || 'Unknown error'}`);
                error.response = { data: response.data };
                throw error;
            }
            return response.data.data || response.data;
        }
        catch (error) {
            console.error('submitData错误详情:', error);
            if (axios.isAxiosError(error)) {
                console.error('Axios错误响应:', error.response?.data);
                // 创建包含详细错误信息的错误对象，但不重新抛出
                const enhancedError = new Error(`API request failed: ${error.response?.data?.msg || error.message}`);
                enhancedError.response = error.response;
                throw enhancedError;
            }
            throw error;
        }
    }
    formatDataForSubmission(data) {
        const formatted = {};
        for (const [key, value] of Object.entries(data)) {
            if (value === null || value === undefined) {
                continue;
            }
            // 如果已经是正确的 {value: ...} 格式，直接使用
            if (typeof value === 'object' && !Array.isArray(value) && value.hasOwnProperty('value')) {
                formatted[key] = value;
                continue;
            }
            // 处理子表单数组（数组中的每个元素都是对象）
            if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
                // 检查是否是附件字段（包含 name, size, mime, url 字段）
                const isAttachmentField = value.length > 0 &&
                    value[0].hasOwnProperty('name') &&
                    value[0].hasOwnProperty('size') &&
                    value[0].hasOwnProperty('mime') &&
                    value[0].hasOwnProperty('url');
                if (isAttachmentField) {
                    // 附件字段直接使用数组，不包装在 { value: ... } 中
                    formatted[key] = { value: value };
                }
                else {
                    // 子表单字段，需要递归处理每个元素
                    formatted[key] = {
                        value: value.map(item => this.formatDataForSubmission(item))
                    };
                }
                continue;
            }
            // 处理复杂对象（如地址、定位等）
            if (typeof value === 'object' && !Array.isArray(value)) {
                formatted[key] = { value };
                continue;
            }
            // 处理基本类型（字符串、数字、布尔值、简单数组等）
            formatted[key] = { value: this.formatValue(value) };
        }
        return formatted;
    }
    formatValue(value) {
        if (value instanceof Date) {
            return value.toISOString();
        }
        if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
            return value.map(item => this.formatDataForSubmission(item));
        }
        return value;
    }
    async getFormData(formId, dataId) {
        try {
            const response = await this.axios.post('/v5/app/entry/data/get', {
                app_id: this.config.appId,
                entry_id: formId,
                data_id: dataId
            });
            if (response.data.code !== 0) {
                throw new Error(`Failed to get form data: ${response.data.msg}`);
            }
            return response.data.data;
        }
        catch (error) {
            if (axios.isAxiosError(error)) {
                throw new Error(`API request failed: ${error.response?.data?.msg || error.message}`);
            }
            throw error;
        }
    }
    async queryFormData(options) {
        try {
            const requestData = {
                app_id: this.config.appId,
                entry_id: options.formId,
                limit: options.limit || 10
            };
            if (options.dataId) {
                requestData.data_id = options.dataId;
            }
            if (options.fields && options.fields.length > 0) {
                requestData.fields = options.fields;
            }
            if (options.filter) {
                requestData.filter = options.filter;
            }
            const response = await this.axios.post('/v5/app/entry/data/list', requestData);
            if (response.data.code !== 0) {
                throw new Error(`Failed to query form data: ${response.data.msg || 'Unknown error'}`);
            }
            return response.data.data;
        }
        catch (error) {
            if (axios.isAxiosError(error)) {
                throw new Error(`API request failed: ${error.response?.data?.msg || error.message}`);
            }
            throw error;
        }
    }
    async updateFormData(formId, dataId, data, options) {
        try {
            const requestData = {
                app_id: this.config.appId,
                entry_id: formId,
                data_id: dataId,
                data: this.formatDataForSubmission(data)
            };
            if (options?.transactionId) {
                requestData.transaction_id = options.transactionId;
            }
            if (options?.isStartTrigger !== undefined) {
                requestData.is_start_trigger = options.isStartTrigger;
            }
            const response = await this.axios.post('/v5/app/entry/data/update', requestData);
            if (response.data.code !== 0) {
                throw new Error(`Failed to update form data: ${response.data.msg}`);
            }
            return response.data.data;
        }
        catch (error) {
            if (axios.isAxiosError(error)) {
                throw new Error(`API request failed: ${error.response?.data?.msg || error.message}`);
            }
            throw error;
        }
    }
    async deleteFormData(formId, dataId, options) {
        try {
            const isMultiple = Array.isArray(dataId);
            const endpoint = isMultiple ? '/v5/app/entry/data/batch_delete' : '/v5/app/entry/data/delete';
            const requestData = {
                app_id: this.config.appId,
                entry_id: formId
            };
            if (isMultiple) {
                requestData.data_ids = dataId;
            }
            else {
                requestData.data_id = dataId;
            }
            if (options?.isStartTrigger !== undefined) {
                requestData.is_start_trigger = options.isStartTrigger;
            }
            const response = await this.axios.post(endpoint, requestData);
            if (response.data.code !== 0) {
                throw new Error(`Failed to delete form data: ${response.data.msg}`);
            }
            return response.data.data;
        }
        catch (error) {
            if (axios.isAxiosError(error)) {
                throw new Error(`API request failed: ${error.response?.data?.msg || error.message}`);
            }
            throw error;
        }
    }
    async getUploadToken(formId, transactionId, fieldId) {
        try {
            const requestData = {
                app_id: this.config.appId,
                entry_id: formId,
                transaction_id: transactionId
            };
            if (fieldId) {
                requestData.widget_id = fieldId;
            }
            const response = await this.axios.post('/v5/app/entry/upload_token', requestData);
            if (response.data.code !== 0) {
                throw new Error(`Failed to get upload token: ${response.data.msg}`);
            }
            return response.data.data;
        }
        catch (error) {
            if (axios.isAxiosError(error)) {
                throw new Error(`API request failed: ${error.response?.data?.msg || error.message}`);
            }
            throw error;
        }
    }
}
//# sourceMappingURL=client.js.map