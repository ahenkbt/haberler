<?php

namespace App\Models\User;

use Illuminate\Database\Eloquent\Model;

class Skill extends Model
{
    public $table = "user_skills";
    protected $fillable = [
        "icon",
        "title",
        "slug",
        "percentage",
        "color",
        "serial_number",
        "language_id",
        "user_id",
    ];

    public function language() {
        return $this->belongsTo(Language::class);
    }
}
