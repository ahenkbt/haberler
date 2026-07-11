<?php

namespace App\Http\Requests\User\CourseManagement\Instructor;

use App\Rules\ImageMimeTypeRule;
use Illuminate\Foundation\Http\FormRequest;

class InstructorStoreRequest extends FormRequest
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
        return [
            'image' => [
                'required',
                new ImageMimeTypeRule()
            ],
            'user_language_id' => 'required',
            'name' => 'required|max:255',
            'occupation' => 'required|max:255',
            'description' => 'required|min:30'
        ];
    }
}
