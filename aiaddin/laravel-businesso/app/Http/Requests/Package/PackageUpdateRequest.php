<?php

namespace App\Http\Requests\Package;

use Illuminate\Foundation\Http\FormRequest;

class PackageUpdateRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     *
     * @return bool
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array
     */
    public function rules(): array
    {
        $hasAiFeature = is_array($this->features) && in_array('One-Click AI Website Setup', $this->features);

        return [
            'title' => 'required|max:255',
            'icon' => 'required',
            'price' => 'required',
            'term' => 'required',
            'serial_number' => 'required|integer',
            'number_of_languages' => 'required',
            'trial_days' => $this->is_trial == "1" ? 'required' : '',
            'video_size_limit' => is_array($this->features) && in_array('Course Management', $this->features) ? 'required|integer' : '',
            'file_size_limit' => is_array($this->features) && in_array('Course Management', $this->features) ? 'required|integer' : '',
            'number_of_vcards' => is_array($this->features) && in_array('vCard', $this->features) ? 'required|integer' : '',

            // AI validation
            'ai_engine' => $hasAiFeature
                ? 'required|in:openai,gemini,pollinations'
                : 'nullable|in:openai,gemini,pollinations',

            'ai_pages' => $hasAiFeature
                ? 'required|array|min:1'
                : 'nullable|array',

            'ai_pages.*' => $hasAiFeature
                ? 'string|max:100'
                : 'nullable|string|max:100',
            // AI generate limit
            'ai_generate_limit' => $hasAiFeature
                ? 'required|integer|min:1'
                : 'nullable|integer|min:1',
        ];
    }
    
    public function messages(): array
    {
        return [
            'trial_days.required' => 'Trial days is required when trial option is checked',
            'video_size_limit.required' => 'Maximum Size of Single File is required when Course Management option is checked',
            'file_size_limit.required' => 'Maximum Size of Single Video is required when Course Management option is checked',

            //  AI messages
            'ai_engine.required' => __('AI Engine is required when One-Click AI Website Setup is enabled') . '.',
            'ai_pages.required' => __('AI Generated Pages is required when One-Click AI Website Setup is enabled') . '.',
            'ai_pages.min' => __('Please select at least one AI Generated Page') . '.',
            
            'ai_generate_limit.required' => __('AI Content Generate Limit is required when One-Click AI Website Setup is enabled') . '.',
            'ai_generate_limit.min' => __('AI Content Generate Limit must be at least 1') . '.',

        ];
    }
}
