<?php

namespace App\Http\Requests\User\CourseManagement;

use App\Models\User\CourseManagement\CourseCategory;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class CourseCategoryRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     *
     * @return bool
     */
    public function authorize()
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules()
    {
        $langid = (int)$this->user_language_id;
        $cc = CourseCategory::where('id', (int)$this->id)->select('language_id')->first();
        return [
            'user_language_id' => request()->isMethod('POST') ? 'required' : '',
            'icon' => request()->isMethod('POST') ? 'required' : '',
            'color' => 'required',
            'name' => [
                'required',
                request()->isMethod('POST') ? Rule::unique('user_course_categories')->where(function ($query) use ($langid) {
                    return $query->where('user_id', Auth::guard('web')->user()->id)->where('language_id', $langid);
                }) : Rule::unique('user_course_categories')->ignore($this->id)->where(function ($query) use ($cc) {
                    return $query->where('user_id', Auth::guard('web')->user()->id)->where('language_id', $cc->language_id);
                })
            ],
            'status' => 'required|numeric',
            'serial_number' => 'required|numeric'
        ];
    }
}
