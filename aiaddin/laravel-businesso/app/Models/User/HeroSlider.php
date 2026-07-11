<?php

namespace App\Models\User;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class HeroSlider extends Model
{
    use HasFactory;

    protected $table = "user_hero_sliders";

    protected $fillable = [
        'user_id',
        'language_id',
        'img',
        'title',
        'subtitle',
        'btn_name',
        'btn_url',
        'serial_number'
    ];

    public function sliderVersionLang()
    {
        return $this->belongsTo(Language::class);
    }
}

