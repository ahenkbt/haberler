<?php

namespace App\Models\User;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ActionSection extends Model
{
    use HasFactory;


    public $table = "user_action_sections";
    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'language_id',
        'user_id',
        'background_image',
        'first_title',
        'second_title',
        'first_button',
        'first_button_url',
        'second_button',
        'second_button_url',
        'image'
    ];

    public function language()
    {
        return $this->belongsTo(Language::class, 'language_id');
    }
}
